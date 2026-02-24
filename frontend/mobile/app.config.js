export default ({ config }) => {
  const baseConfig = {
    scheme: "Crew_Connect",
    name: "CrewConnect",
    slug: "CrewConnect",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/CC_logo_nobackground.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/CC_logo_nobackground.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/CC_logo_nobackground.png",
      bundler: "metro"
    }
  };

  // Add baseUrl for production builds
  if (process.env.EXPO_PUBLIC_ENV === 'production') {
    baseConfig.experiments = {
      baseUrl: "/mobile"
    };
  }

  return {
    expo: baseConfig
  };
};
