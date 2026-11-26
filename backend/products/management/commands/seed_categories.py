from django.core.management.base import BaseCommand
from products.models import Category

INITIAL_CATEGORIES = [
    {
        'name': 'Handloom & Textiles',
        'slug': 'handloom-textiles',
        'description': 'Handwoven sarees, dupattas, shawls, and fabrics from India’s master weavers across Varanasi, Pochampally, Chanderi, and Bengal.',
        'image_url': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    },
    {
        'name': 'Pottery & Ceramics',
        'slug': 'pottery-ceramics',
        'description': 'Jaipur blue pottery, Khurja ceramics, and terracotta pottery handcrafted and hand-painted by traditional ceramicists.',
        'image_url': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
    },
    {
        'name': 'Jewellery & Accessories',
        'slug': 'jewellery-accessories',
        'description': 'Kundan, Meenakari, Dokra, and tribal silver jewellery handcrafted by regional artisans.',
        'image_url': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
    },
    {
        'name': 'Home Décor',
        'slug': 'home-decor',
        'description': 'Artisanal brassware, marble inlays, hand-carved wooden accents, and lamps to bring Indian heritage into living spaces.',
        'image_url': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    },
    {
        'name': 'Paintings & Art',
        'slug': 'paintings-art',
        'description': 'Traditional folk and tribal paintings including Madhubani from Bihar, Warli from Maharashtra, Pattachitra from Odisha, and Miniature Art from Rajasthan.',
        'image_url': 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&q=80',
    },
    {
        'name': 'Handmade Crafts',
        'slug': 'handmade-crafts',
        'description': 'Assam bamboo and cane craft, Channapatna wooden toys, leather juttis, and diverse mixed-media Indian crafts.',
        'image_url': 'https://images.unsplash.com/photo-1612198527726-b93c72a71bec?w=600&q=80',
    },
]


class Command(BaseCommand):
    help = 'Seeds initial 6 craft categories for BharatBazaar marketplace.'

    def handle(self, *args, **options):
        created_count = 0
        for item in INITIAL_CATEGORIES:
            category, created = Category.objects.get_or_create(
                slug=item['slug'],
                defaults={
                    'name': item['name'],
                    'description': item['description'],
                    'image_url': item['image_url'],
                    'is_active': True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created category: {category.name}"))
            else:
                self.stdout.write(f"Category already exists: {category.name}")

        self.stdout.write(self.style.SUCCESS(f"Successfully processed categories ({created_count} created)."))
