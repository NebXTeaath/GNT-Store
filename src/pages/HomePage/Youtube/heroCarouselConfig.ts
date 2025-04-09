// src/config/heroCarouselConfig.ts

export interface HeroSlide {
    id: string; // Unique identifier for the slide
    mediaUrl: string; // URL/path to the media asset
    mediaType: 'image' | 'gif' | 'webp' | 'video' | 'youtube'; // Type of media
    altText: string; // Alt text for accessibility
    linkUrl: string; // Destination URL when the slide is clicked
  }
  
  export const heroSlidesConfig: HeroSlide[] = [
    {
      id: 'slide-1',
      mediaUrl: 'https://youtu.be/nq1M_Wc4FIc?start=9&end=20',
      mediaType: 'youtube', // YouTube slide
      altText: 'Spiderman 2',
      linkUrl: '/product/6240f9eb-1a17-45c4-b09f-30b0d74eccff',
    },
    {
      id: 'slide-2',
      mediaUrl: 'https://youtu.be/wj-A-ieL8HE?start=18&end=30',
      mediaType: 'youtube', // YouTube slide
      altText: 'PC Gaming',
      linkUrl: '/Computers',
    },
    {
      id: 'slide-3',
      mediaUrl: 'https://youtu.be/gmA6MrX81z4?start=41&end=50',
      mediaType: 'youtube', // YouTube slide
      altText: 'Red Dead Redemption 2',
      linkUrl: '/product/4f0b75f8-4813-4e9a-9e73-d04a848148e6',
    },
    {
      id: 'slide-4',
      mediaUrl: 'https://youtu.be/lC6mXu3evMA?start=313&end=320',
      mediaType: 'youtube', // YouTube slide
      altText: 'Repair Services',
      linkUrl: '/repair',
    },
    
  ];
  