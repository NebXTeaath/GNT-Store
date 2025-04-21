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
      linkUrl: '/product/sony-ps5-spiderman-2-standard-edition',
    },
    {
      id: 'slide-2',
      mediaUrl: 'https://youtu.be/wj-A-ieL8HE?start=18&end=30',
      mediaType: 'youtube', // YouTube slide
      altText: 'PC Gaming',
      linkUrl: '/Computers/PC?layout=list',
    },
    {
      id: 'slide-3',
      mediaUrl: 'https://youtu.be/gmA6MrX81z4?start=41&end=50',
      mediaType: 'youtube', // YouTube slide
      altText: 'Red Dead Redemption 2',
      linkUrl: '/product/red-dead-redemption-2-ps4',
    },
    {
      id: 'slide-4',
      mediaUrl: 'https://youtu.be/lC6mXu3evMA?start=313&end=320',
      mediaType: 'youtube', // YouTube slide
      altText: 'Repair Services',
      linkUrl: '/repair-home',
    },
    
  ];
  