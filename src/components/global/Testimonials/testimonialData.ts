
export interface Testimonial {
    id: string;
    name: string;
    location: string;
    rating: number; // 1-5
    content: string;
    date: string;
    service?: string; // For repair testimonials
    device?: string; // For repair testimonials
    productPurchased?: string; // For product testimonials
  }
  
  // Mock data for product testimonials
  export const productTestimonials: Testimonial[] = [
    {
      id: "prod-001",
      name: "Rajesh Sharma",
      location: "Mumbai, Maharashtra",
      rating: 5,
      content: "I purchased a PS5 from GNT Store and I'm extremely happy with the product quality. The delivery was super fast and the packaging was excellent. Will definitely shop again!",
      date: "2024-03-12",
      productPurchased: "PlayStation 5 Disc Edition"
    },
    {
      id: "prod-002",
      name: "Priya Patel",
      location: "Bangalore, Karnataka",
      rating: 5,
      content: "Brilliant service! Ordered a Graphics card on Monday and received it by Thursday. Thank you GNT team!",
      date: "2024-02-28",
      productPurchased: "MSI Geforce RTX 3050 Ventus"
    },
    {
      id: "prod-003",
      name: "Amit Kumar",
      location: "Delhi, NCR",
      rating: 4,
      content: "The PS4 PRO I purchased was in pristine condition as promised. Great value for money compared to other retailers. Just a small delay in shipping, but overall very satisfied.",
      date: "2024-03-05",
      productPurchased: "PS4 PRO"
    },
    {
      id: "prod-004",
      name: "Sneha Gupta",
      location: "Hyderabad, Telangana",
      rating: 5,
      content: "This is my third purchase from GNT Store and they never disappoint. The gaming PC was perfectly configured as per my requirements and the after-sales support is fantastic!",
      date: "2024-03-18",
      productPurchased: "Custom Gaming PC"
    },
    {
      id: "prod-005",
      name: "Vikram Singh",
      location: "Pune, Maharashtra",
      rating: 4,
      content: "Bought a pre-owned PS4 Slim and it looks and works like new. The condition was accurately described and the price was unbeatable. Very happy with my purchase!",
      date: "2024-02-15",
      productPurchased: "PS4 Slim (pre-owned)"
    },
    {
      id: "prod-006",
      name: "Ananya Desai",
      location: "Chennai, Tamil Nadu",
      rating: 5,
      content: "GNT Store offers genuine products at reasonable prices. My entire gaming setup was purchased from them and everything works flawlessly. Their customer support is top-notch!",
      date: "2024-03-22",
      productPurchased: "Complete Gaming Setup"
    }
  ];
  
  // Mock data for repair testimonials
  export const repairTestimonials: Testimonial[] = [
    {
      id: "rep-001",
      name: "Arun Verma",
      location: "Dadar, Mumbai",
      rating: 5,
      content: "My PS4 had been overheating constantly. The GNT repair team not only fixed it but also explained what went wrong and how to prevent it in future. Console running smooth now!",
      date: "2024-03-10",
      service: "Console Repair",
      device: "PlayStation 4"
    },
    {
      id: "rep-002",
      name: "Meenakshi Reddy",
      location: "Thane, Mumbai",
      rating: 5,
      content: "Had a gaming laptop with a broken display. The repair was completed within 48 hours as promised, and the replacement screen is working perfectly. Very professional service!",
      date: "2024-03-15",
      service: "Laptop Display Replacement",
      device: "Lenovo Legion Y540"
    },
    {
      id: "rep-003",
      name: "Kabir Khanna",
      location: "Andheri, Mumbai",
      rating: 4,
      content: "My custom PC was not booting. The technician diagnosed it as a faulty power supply and replaced it quickly. Fair pricing and honest service. Would recommend!",
      date: "2024-02-22",
      service: "PC Repair",
      device: "Custom Gaming PC"
    },
    {
      id: "rep-004",
      name: "Divya Nair",
      location: "Vasai, Mumbai",
      rating: 5,
      content: "Outstanding service! My Xbox controller drift issue was fixed promptly. The technician even cleaned the entire controller at no extra cost. 5-star experience for sure!",
      date: "2024-03-08",
      service: "Controller Repair",
      device: "Xbox Series X Controller"
    },
    {
      id: "rep-005",
      name: "Suresh Iyer",
      location: "Virar, Mumbai",
      rating: 5,
      content: "I was worried my water-damaged Switch was beyond repair. GNT's repair team not only fixed it but recovered all my saved data as well! Extremely grateful for their expertise.",
      date: "2024-03-20",
      service: "Water Damage Repair",
      device: "Nintendo Switch"
    },
    {
      id: "rep-006",
      name: "Farhan Ahmed",
      location: "Borivali, Mumbai",
      rating: 4,
      content: "Had issues with my gaming PC's performance. The diagnostic service identified multiple problems and fixed them all in one session. Machine is running better than ever now.",
      date: "2024-02-18",
      service: "PC Performance Optimization",
      device: "Gaming Desktop"
    }
  ];
  