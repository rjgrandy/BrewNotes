"""API regression tests; use a migrated, temporary database, never the user's data."""
import io
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
import zipfile

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
TEST_ROOT = BACKEND / '.test-data'
TEST_ROOT.mkdir(exist_ok=True)
temporary = tempfile.TemporaryDirectory(prefix='journal-', dir=TEST_ROOT)
data_dir = Path(temporary.name).resolve()
assert data_dir.parent == TEST_ROOT.resolve()
os.environ.update(DATA_DIR=str(data_dir), DB_PATH=str(data_dir / 'app.db'), UPLOAD_DIR=str(data_dir / 'uploads'))

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.database import engine

config = Config(str(BACKEND / 'alembic.ini'))
config.set_main_option('script_location', str(BACKEND / 'alembic'))
config.set_main_option('sqlalchemy.url', f"sqlite:///{data_dir / 'app.db'}")
command.upgrade(config, 'head')


def photo_bytes(size=(120, 80), orientation=None):
    output = io.BytesIO()
    image = Image.new('RGB', size, 'red')
    exif = image.getexif()
    if orientation:
        exif[274] = orientation
    image.save(output, format='JPEG', exif=exif)
    return output.getvalue()


class JournalTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.bean = self.client.post('/api/beans', json={'name': 'Test coffee', 'rating': 5}).json()

    def tearDown(self):
        self.client.close()

    def brew(self, bean=None, drink_type='Espresso', rating=4):
        response = self.client.post('/api/drinks', json={
            'bean_id': (bean or self.bean)['id'], 'drink_type': drink_type,
            'temperature_level': 'MEDIUM', 'body_level': 'MEDIUM', 'order': 'COFFEE_FIRST',
            'coffee_volume_ml': 40, 'milk_volume_ml': 0, 'strength_level': 'HIGH', 'grind_setting': 3,
            'overall_rating': rating, 'sweetness': 3, 'bitterness': 3, 'acidity': 3,
            'body_mouthfeel': 3, 'balance': 3, 'would_make_again': True, 'dialed_in': False,
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_history_filters_compose_and_include_archived_beans(self):
        first = self.brew()
        self.brew(drink_type='Cortado')
        other = self.client.post('/api/beans', json={'name': 'Other coffee'}).json()
        self.brew(bean=other)
        self.client.post(f"/api/beans/{self.bean['id']}/archive")
        result = self.client.get('/api/drinks', params={'bean_id': self.bean['id'], 'drink_type': 'Espresso'}).json()
        self.assertEqual([row['id'] for row in result], [first['id']])
        self.assertTrue(self.client.get(f"/api/beans/{self.bean['id']}").json()['archived'])

    def test_photo_replacement_preserves_identity_cover_and_gallery_order(self):
        path = f"/api/beans/{self.bean['id']}/photos"
        first = self.client.post(path, files={'file': ('photo.jpg', photo_bytes(), 'image/jpeg')}).json()
        original = first['photos'][0]
        self.client.post(path, files={'file': ('second.jpg', photo_bytes(), 'image/jpeg')})
        updated = self.client.post(f"{path}/{original['id']}/image", files={'file': ('crop.jpg', photo_bytes((60, 60)), 'image/jpeg')})
        self.assertEqual(updated.status_code, 200, updated.text)
        bean = updated.json()
        self.assertEqual(len(bean['photos']), 2)
        edited = next(photo for photo in bean['photos'] if photo['id'] == original['id'])
        self.assertEqual(edited['sort_order'], original['sort_order'])
        self.assertEqual(bean['image_path'], edited['image_path'])
        self.assertFalse(Path(original['image_path']).exists())
        with Image.open(edited['image_path']) as image:
            self.assertEqual(image.size, (60, 60))
        other = self.client.post('/api/beans', json={'name': 'Other'}).json()
        self.assertEqual(self.client.post(f"/api/beans/{other['id']}/photos/{original['id']}/image", files={'file': ('x.jpg', photo_bytes(), 'image/jpeg')}).status_code, 404)

    def test_invalid_upload_leaves_original_untouched(self):
        path = f"/api/beans/{self.bean['id']}/photos"
        first = self.client.post(path, files={'file': ('photo.jpg', photo_bytes(), 'image/jpeg')}).json()
        photo = first['photos'][0]
        response = self.client.post(f"{path}/{photo['id']}/image", files={'file': ('broken.jpg', b'not an image', 'image/jpeg')})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.get(f"/api/beans/{self.bean['id']}").json()['image_path'], first['image_path'])
        self.assertTrue(Path(first['image_path']).exists())

    def test_camera_orientation_and_thumbnail_match(self):
        response = self.client.post(f"/api/beans/{self.bean['id']}/photos", files={'file': ('camera.jpg', photo_bytes((120, 80), 6), 'image/jpeg')})
        self.assertEqual(response.status_code, 200, response.text)
        photo = response.json()['photos'][0]
        for path in [photo['image_path'], photo['thumbnail_path']]:
            with Image.open(path) as image:
                self.assertEqual(image.size, (80, 120))
                self.assertIsNone(image.getexif().get(274))

    def test_drink_photo_cleanup_and_missing_bean_validation(self):
        drink = self.brew()
        path = f"/api/drinks/{drink['id']}"
        first = self.client.post(path + '/photo', files={'file': ('one.jpg', photo_bytes(), 'image/jpeg')}).json()
        second = self.client.post(path + '/photo', files={'file': ('two.jpg', photo_bytes(), 'image/jpeg')}).json()
        self.assertFalse(Path(first['photo_path']).exists())
        self.assertEqual(self.client.put(path, json={**drink, 'bean_id': 'missing'}).status_code, 422)
        self.client.delete(path)
        self.assertFalse(Path(second['photo_path']).exists())
        self.assertFalse(Path(second['thumbnail_path']).exists())

    def test_recipe_round_trip_and_recommendation(self):
        drink = self.brew(rating=5)
        path = f"/api/beans/{self.bean['id']}/recipes/Espresso"
        self.assertEqual(self.client.put(path, json={'settings': {'grind_setting': 3, 'coffee_volume_ml': 40}, 'source': 'from_drink', 'source_drink_id': drink['id']}).status_code, 200)
        recipes = self.client.get(f"/api/beans/{self.bean['id']}").json()['recipes']
        self.assertEqual(recipes[0]['settings']['grind_setting'], 3)
        recommendation = self.client.get(f"/api/beans/{self.bean['id']}/recommended-settings?drink_type=Espresso").json()
        self.assertEqual(recommendation['recommended']['grind_setting'], 3)
        self.assertEqual(recommendation['total_considered'], 1)

    def test_invalid_inputs_are_rejected_without_changing_saved_data(self):
        self.assertEqual(self.client.post('/api/beans', json={'name': '   '}).status_code, 422)
        self.assertEqual(self.client.post('/api/beans', json={'name': 'Coffee', 'price': -1}).status_code, 422)
        drink = self.brew()
        path = f"/api/drinks/{drink['id']}"
        for patch in [{'coffee_volume_ml': -10}, {'overall_rating': 6}, {'grind_setting': 0}]:
            self.assertEqual(self.client.put(path, json={**drink, **patch}).status_code, 422)
        self.assertEqual(self.client.get(path).json()['coffee_volume_ml'], 40)

    def test_backup_contains_database_recipes_ratings_and_gallery(self):
        self.brew()
        self.client.put(f"/api/beans/{self.bean['id']}/recipes/Espresso", json={'settings': {'grind_setting': 3}})
        self.client.post(f"/api/beans/{self.bean['id']}/photos", files={'file': ('photo.jpg', photo_bytes(), 'image/jpeg')})
        response = self.client.get('/api/export.zip')
        self.assertEqual(response.status_code, 200)
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            self.assertIn('app.db', archive.namelist())
            exported = json.loads(archive.read('export.json'))
            bean = next(b for b in exported['beans'] if b['id'] == self.bean['id'])
            self.assertEqual(bean['rating'], 5)
            self.assertEqual(len(bean['recipes']), 1)
            self.assertEqual(len(bean['photos']), 1)
            self.assertTrue(any(name.startswith('uploads/') for name in archive.namelist()))
            snapshot = data_dir / 'restored.db'
            snapshot.write_bytes(archive.read('app.db'))
            with sqlite3.connect(snapshot) as db:
                self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(db.execute('SELECT name FROM beans WHERE id=?', (self.bean['id'],)).fetchone()[0], 'Test coffee')


if __name__ == '__main__':
    try:
        unittest.main()
    finally:
        engine.dispose()
        temporary.cleanup()
