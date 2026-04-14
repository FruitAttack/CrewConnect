export default () => {
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
      package: "com.spexzx234.crewconnect",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/CC_logo_nobackground.png",
      bundler: "metro"
    },

   
    extra: {
      eas: {
        projectId: "0e860b4a-21fc-4782-a5d6-3e0b30e0665b"
      }
    }
  };

  if (process.env.EXPO_PUBLIC_ENV === "production") {
    baseConfig.experiments = {
      baseUrl: "/mobile"
    };
  }

  return {
    expo: baseConfig
  };
};