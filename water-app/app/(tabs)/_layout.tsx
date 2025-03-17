import { Tabs } from "expo-router";
import { BottomNavigation, BottomNavigationTab, Icon, IconProps } from '@ui-kitten/components';
import { View } from "react-native";
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const HomeIcon = (props: IconProps) => (
  <Icon {...props} name='home-outline'/>
);

const SettingsIcon = (props: IconProps) => (
  <Icon {...props} name='settings-outline'/>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => (
        <View>
          <BottomNavigation
            selectedIndex={props.state.index}
            onSelect={index => props.navigation.navigate(props.state.routes[index].name)}
          >
            <BottomNavigationTab title='HOME' icon={HomeIcon}/>
            <BottomNavigationTab title='SETTINGS' icon={SettingsIcon}/>
          </BottomNavigation>
        </View>
      )}
    />
  );
}