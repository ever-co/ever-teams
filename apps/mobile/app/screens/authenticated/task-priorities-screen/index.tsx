/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ViewStyle,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Animated,
  Keyboard,
  Platform
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { translate } from '../../../i18n';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { typography, useAppTheme } from '../../../theme';
import { ActivityIndicator } from 'react-native-paper';
import { ITaskPriorityItem } from '../../../services/interfaces/ITaskPriority';
import TaskPriorityForm from './components/task-priority-form';
import { useTaskPriority } from '../../../services/hooks/features/use-task-priority';
import PriorityItem from './components/priority-item';
import { BlurView } from 'expo-blur';
import { useRoute, RouteProp } from '@react-navigation/native';

// Create a type for the route params
type TaskPriorityRouteParams = {
  previousTab?: 1 | 2; // Explicitly type as 1 | 2 union type
};

// Properly type the route object
type TaskPriorityRouteProp = RouteProp<{ TaskPriority: TaskPriorityRouteParams }, 'TaskPriority'>;

export const TaskPriorityScreen: FC<AuthenticatedDrawerScreenProps<'TaskPriority'>> =
  function AuthenticatedDrawerScreen(_props) {
    const { colors, dark } = useAppTheme();
    const { navigation } = _props;

    // Use the properly typed route
    const route = useRoute<TaskPriorityRouteProp>();

    // Get the previousTab parameter with type assertion
    const previousTab = route.params?.previousTab || 2 as const;

    // Handle back navigation with correct tab
    const handleGoBack = useCallback(() => {
      navigation.navigate('Setting', { activeTab: previousTab });
    }, [navigation, previousTab]);

    const { isLoading, priorities, deletePriority, updatePriority, createPriority } = useTaskPriority();
    const [editMode, setEditMode] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<ITaskPriorityItem>(null);
    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // ref
    const sheetRef = useRef<BottomSheet>(null);

    // Define snap points with only one snap point at 60%
    const snapPoints = useMemo(() => ['60%'], []);

    const openForEdit = useCallback((item: ITaskPriorityItem) => {
      setEditMode(true);
      setItemToEdit(item);
      setBottomSheetVisible(true);

      // Force immediate update of the sheet position
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.snapToIndex(0);
        }
      }, 150);
    }, []);

    const handleCreateNew = useCallback(() => {
      setEditMode(false);
      setItemToEdit(null);
      setBottomSheetVisible(true);

      // Force immediate update of the sheet position
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.snapToIndex(0);
        }
      }, 150);
    }, []);

    const handleClose = useCallback(() => {
      // Close the sheet first
      if (sheetRef.current) {
        sheetRef.current.close();
      }

      // Clear state after animation completes
      setTimeout(() => {
        setBottomSheetVisible(false);
        Keyboard.dismiss();
      }, 250);
    }, []);

    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (sheetRef.current) {
          sheetRef.current.close();
        }
      };
    }, []);

    // Keyboard listeners
    useEffect(() => {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
          setKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        }
      );

      const keyboardWillHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }, []);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          enableTouchThrough={false}
          pressBehavior="close"
          opacity={0.7}
        />
      ),
      []
    );

    return (
      <Screen
        contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
        safeAreaEdges={['top']}
      >
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <Animated.View style={{ flex: 1 }}>
          <View style={[$headerContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleGoBack} // Use our custom handler for back navigation
              >
                <AntDesign name="arrowleft" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.primary }]}>
                {translate('settingScreen.priorityScreen.mainTitle')}
              </Text>
            </View>
          </View>

          <View style={{ width: '100%', padding: 20, flex: 1 }}>
            <View style={styles.listHeaderContainer}>
              <Text style={styles.title2}>
                {translate('settingScreen.priorityScreen.listPriorities')}
              </Text>
              <TouchableOpacity
                accessibilityLabel={translate('settingScreen.priorityScreen.createNewPriorityText')}
                accessibilityRole="button"
                style={{
                  ...styles.createButtonSmall,
                  borderColor: dark ? '#6755C9' : '#3826A6',
                  backgroundColor: dark ? 'rgba(103, 85, 201, 0.15)' : 'rgba(56, 38, 166, 0.15)'
                }}
                onPress={handleCreateNew}
              >
                <Ionicons name="add" size={18} color={dark ? '#6755C9' : '#3826A6'} />
                <Text style={{ ...styles.btnTextSmall, color: dark ? '#6755C9' : '#3826A6' }}>
                  {translate('settingScreen.priorityScreen.createNewPriorityText')}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flex: 1,
                width: '100%'
              }}
            >
              {isLoading ? <ActivityIndicator size={'small'} color={'#3826A6'} /> : null}
              {!isLoading && priorities?.total === 0 ? (
                <Text style={{ ...styles.noStatusTxt, color: colors.primary }}>
                  {translate('settingScreen.priorityScreen.noActivePriorities')}
                </Text>
              ) : null}

              <FlatList
                bounces={false}
                showsVerticalScrollIndicator={false}
                style={{ width: '100%' }}
                contentContainerStyle={{ flexGrow: 1 }}
                data={priorities?.items}
                renderItem={({ item }) => (
                  <PriorityItem
                    openForEdit={() => openForEdit(item)}
                    onDeletePriority={() => deletePriority(item.id)}
                    priority={item}
                  />
                )}
                keyExtractor={(_, index) => index.toString()}
                ListFooterComponent={() => <View style={{ marginBottom: 40 }} />}
              />
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel={translate('settingScreen.priorityScreen.createNewPriorityText')}
            accessibilityRole="button"
            style={{
              ...styles.createButton,
              borderColor: dark ? '#6755C9' : '#3826A6',
              backgroundColor: dark ? 'rgba(103, 85, 201, 0.05)' : 'rgba(56, 38, 166, 0.05)'
            }}
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={24} color={dark ? '#6755C9' : '#3826A6'} />
            <Text style={{ ...styles.btnText, color: dark ? '#6755C9' : '#3826A6' }}>
              {translate('settingScreen.priorityScreen.createNewPriorityText')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Sheet Container */}
        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              pointerEvents: bottomSheetVisible ? 'auto' : 'none',
              zIndex: bottomSheetVisible ? 1000 : -1
            }
          ]}
        >
          <BottomSheet
            ref={sheetRef}
            index={-1}  // Start fully closed
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            onClose={handleClose}
            backdropComponent={renderBackdrop}
            enableContentPanningGesture={true}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{
              backgroundColor: colors.background,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.27,
              shadowRadius: 4.65,
              elevation: 10,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24
            }}
            handleIndicatorStyle={{
              backgroundColor: dark ? '#FFFFFF' : '#000000',
              width: 50,
              height: 5,
              marginTop: 10
            }}
          >
            <BottomSheetScrollView
              style={{ backgroundColor: colors.background }}
              contentContainerStyle={{
                flexGrow: 1
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {bottomSheetVisible && (
                <TaskPriorityForm
                  item={itemToEdit}
                  onDismiss={handleClose}
                  onUpdatePriority={updatePriority}
                  onCreatePriority={createPriority}
                  isEdit={editMode}
                />
              )}
            </BottomSheetScrollView>
          </BottomSheet>
        </View>

        {/* BlurView shown when the bottom sheet is open */}
        {bottomSheetVisible && (
          <BlurView
            intensity={15}
            tint="dark"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              zIndex: 999  // Just below the sheet container
            }}
          />
        )}
      </Screen>
    );
  };

const $container: ViewStyle = {
  flex: 1
};

const $headerContainer: ViewStyle = {
  padding: 20,
  paddingVertical: 16,
  shadowColor: 'rgba(0, 0, 0, 0.6)',
  shadowOffset: {
    width: 0,
    height: 2
  },
  shadowOpacity: 0.07,
  shadowRadius: 1.0,
  elevation: 1,
  zIndex: 10
};

const styles = StyleSheet.create({
  btnText: {
    color: '#3826A6',
    fontFamily: typography.primary.semiBold,
    fontSize: 18,
    fontStyle: 'normal',
    marginLeft: 8
  },
  btnTextSmall: {
    color: '#3826A6',
    fontFamily: typography.primary.semiBold,
    fontSize: 14,
    fontStyle: 'normal',
    marginLeft: 4
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%'
  },
  createButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#3826A6',
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
    padding: 14,
    width: '90%'
  },
  createButtonSmall: {
    alignItems: 'center',
    borderColor: '#3826A6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 6,
    paddingHorizontal: 10
  },
  listHeaderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%'
  },
  noStatusTxt: {
    color: '#7E7991',
    fontFamily: typography.primary.semiBold,
    fontSize: 16
  },
  title: {
    alignSelf: 'center',
    fontFamily: typography.primary.semiBold,
    fontSize: 16,
    textAlign: 'center',
    width: '80%'
  },
  title2: {
    color: '#7E7991',
    fontFamily: typography.primary.semiBold,
    fontSize: 16
  }
});
