import unittest

from PIL import Image

from findwise_ml.ingest import is_blank, to_doc

ROW = {
    "id": 1, "productDisplayName": "Watch", "gender": "Men", "masterCategory": "Accessories",
    "subCategory": "Watches", "articleType": "Watches", "baseColour": "Black", "season": "Winter",
    "usage": "Casual", "year": 2012,
}


class BlankImageTest(unittest.TestCase):
    def test_single_colour_image_is_blank(self):
        self.assertTrue(is_blank(Image.new("RGB", (60, 80), "white")))

    def test_faint_product_on_white_is_not_blank(self):
        image = Image.new("RGB", (60, 80), "white")
        image.putpixel((30, 40), (200, 170, 60))  # e.g. a thin gold chain
        self.assertFalse(is_blank(image))

    def test_doc_without_vector_omits_the_field(self):
        self.assertNotIn("image_vector", to_doc(ROW, None))
        self.assertEqual(to_doc(ROW, [0.1])["image_vector"], [0.1])


if __name__ == "__main__":
    unittest.main()
