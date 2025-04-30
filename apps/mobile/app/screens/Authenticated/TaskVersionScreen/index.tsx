import React, { FC, useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ViewStyle,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Keyboard,
  Animated,
  Platform
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/AuthenticatedNavigator';
import { translate } from '../../../i18n';
import { typography, useAppTheme } from '../../../theme';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTaskVersion } from '../../../services/hooks/features/useTaskVersion';
import { ITaskVersionItemList } from '../../../services/interfaces/ITaskVersion';
import { BlurView } from 'expo-blur';
import VersionItem from './components/VersionItem';
import TaskVersionForm from './components/TaskVersionForm';

export const TaskVersionScreen: FC<AuthenticatedDrawerScreenProps<'TaskVersion'>> = function AuthenticatedDrawerScreen(
  _props
) {
  const { colors, dark } = useAppTheme();
  const { navigation } = _props;

  const { isLoading, versions, deleteTaskVersion, updateTaskVersion, createTaskVersion } = useTaskVersion();

  const [editMode, setEditMode] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ITaskVersionItemList>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const sheetRef = useRef<BottomSheet>(null);

  // Define a single snap point for simplicity
  const snapPoints = useMemo(() => ['60%'], []);

  // Modified to dismiss keyboard before opening the sheet
  const openForEdit = useCallback((item: ITaskVersionItemList) => {
    // First dismiss any existing keyboard
    Keyboard.dismiss();

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

  // Modified to dismiss keyboard before opening the sheet
  const handleCreateNew = useCallback(() => {
    // First dismiss any existing keyboard
    Keyboard.dismiss();

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

  // Modified to ensure keyboard is dismissed first
  const handleClose = useCallback(() => {
    // First dismiss keyboard
    Keyboard.dismiss();

    if (sheetRef.current) {
      sheetRef.current.close();
    }

    // Clear state after animation completes
    setTimeout(() => {
      setBottomSheetVisible(false);
    }, 250);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      Keyboard.dismiss();
      setBottomSheetVisible(false);

      if (sheetRef.current) {
        sheetRef.current.close();
      }
    };
  }, []);

  // IMPORTANT CHANGE: Keyboard listeners only activate when bottom sheet is visible
  useEffect(() => {
    // Only set up listeners if bottom sheet is visible
    if (!bottomSheetVisible) return () => {};

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
  }, [bottomSheetVisible]); // Only run when bottomSheetVisible changes

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
    <Screen contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={['top']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <Animated.View style={{ flex: 1 }}>
        <View style={[$headerContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('Setting')}
            >
              <AntDesign name="arrowleft" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.primary }]}>
              {translate('settingScreen.versionScreen.mainTitle')}
            </Text>
          </View>
        </View>

        <View style={{ width: '100%', padding: 20, flex: 1 }}>
          <View style={styles.listHeaderContainer}>
            <Text style={styles.title2}>{translate('settingScreen.versionScreen.listOfVersions')}</Text>
            <TouchableOpacity
              accessibilityLabel={translate('settingScreen.versionScreen.createNewVersionButton')}
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
                {translate('settingScreen.versionScreen.createNewVersionButton')}
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
            {!isLoading && versions?.total === 0 ? (
              <Text style={{ ...styles.noVersionTxt, color: colors.primary }}>
                {translate('settingScreen.versionScreen.noActiveVersions')}
              </Text>
            ) : null}

            <FlatList
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={{ width: '100%' }}
              data={versions?.items}
              renderItem={({ item }) => (
                <VersionItem
                  openForEdit={() => openForEdit(item)}
                  onDeleteTask={() => deleteTaskVersion(item.id)}
                  version={item}
                />
              )}
              keyExtractor={(_, index) => index.toString()}
              ListFooterComponent={() => <View style={{ marginBottom: 40 }} />}
            />
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel={translate('settingScreen.versionScreen.createNewVersionButton')}
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
            {translate('settingScreen.versionScreen.createNewVersionButton')}
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
          index={-1}  // Start closed (-1)
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onClose={handleClose}
          backdropComponent={renderBackdrop}
          enableContentPanningGesture={false} // Changed from true to false
          keyboardBehavior="interactive" // Changed from "extend" to "interactive"
          keyboardBlurBehavior="none"
          android_keyboardInputMode="adjustResize"
          // handleHeight={30} // Set explicit handle height
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
              padding: 0 // Changed from padding: 16
            }}
            keyboardShouldPersistTaps="always" // Changed from "handled" to "always"
            showsVerticalScrollIndicator={false}
          >
            {bottomSheetVisible && (
              <TaskVersionForm
                item={itemToEdit}
                onDismiss={handleClose}
                onUpdateVersion={updateTaskVersion}
                onCreateVersion={createTaskVersion}
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
  noVersionTxt: {
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
