// Script to generate iOS splash screen dimensions
// Run this after creating the base splash screen images

const iosSplashScreens = [
  // iPhone SE (1st gen) and iPod touch
  { name: "640x1136.png", width: 640, height: 1136, device: "iPhone SE (1st gen)" },
  // iPhone 8, 7, 6s, 6
  { name: "750x1334.png", width: 750, height: 1334, device: "iPhone 8/7/6s/6" },
  // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
  { name: "1242x2208.png", width: 1242, height: 2208, device: "iPhone 8 Plus/7 Plus" },
  // iPhone X, XS, 11 Pro
  { name: "1125x2436.png", width: 1125, height: 2436, device: "iPhone X/XS/11 Pro" },
  // iPhone XR, 11
  { name: "828x1792.png", width: 828, height: 1792, device: "iPhone XR/11" },
  // iPhone XS Max, 11 Pro Max
  { name: "1242x2688.png", width: 1242, height: 2688, device: "iPhone XS Max/11 Pro Max" },
  // iPhone 12, 13, 14
  { name: "1170x2532.png", width: 1170, height: 2532, device: "iPhone 12/13/14" },
  // iPhone 12 Pro, 13 Pro, 14 Pro
  { name: "1284x2778.png", width: 1284, height: 2778, device: "iPhone 12 Pro/13 Pro/14 Pro" },
  // iPhone 14 Plus, 13 Pro Max
  { name: "1284x2778.png", width: 1284, height: 2778, device: "iPhone 14 Plus/13 Pro Max" },
  // iPad Mini, Air, 9.7-inch
  { name: "1536x2048.png", width: 1536, height: 2048, device: "iPad Mini/Air/9.7-inch" },
  // iPad Pro 10.5-inch
  { name: "1668x2224.png", width: 1668, height: 2224, device: "iPad Pro 10.5-inch" },
  // iPad Pro 11-inch
  { name: "1668x2388.png", width: 1668, height: 2388, device: "iPad Pro 11-inch" },
  // iPad Pro 12.9-inch
  { name: "2048x2732.png", width: 2048, height: 2732, device: "iPad Pro 12.9-inch" },
];

console.log("iOS Splash Screen Dimensions Needed:");
console.log("=====================================");
iosSplashScreens.forEach(screen => {
  console.log(`${screen.device}: ${screen.width}x${screen.height}px (${screen.name})`);
});

console.log("\nTo complete the setup:");
console.log("1. Create a base splash screen design (2732x2732px recommended)");
console.log("2. Export it to the above dimensions");
console.log("3. Place them in /public/AppImages/ios/");
console.log("4. Update index.html with the specific device media queries");