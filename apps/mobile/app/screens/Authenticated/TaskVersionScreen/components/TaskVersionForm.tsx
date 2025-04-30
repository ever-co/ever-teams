import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Keyboard } from 'react-native';
import { translate } from '../../../../i18n';
import { typography, useAppTheme } from '../../../../theme';
import { ITaskVersionCreate, ITaskVersionItemList } from '../../../../services/interfaces/ITaskVersion';

// Wrap with React.memo to prevent unnecessary re-renders
const TaskVersionForm = React.memo(({
  isEdit,
  onDismiss,
  item,
  onCreateVersion,
  onUpdateVersion,
  createVersionModal
}: {
  isEdit: boolean;
  onDismiss: () => unknown;
  item?: ITaskVersionItemList;
  onUpdateVersion: (id: string, data: ITaskVersionCreate) => unknown;
  onCreateVersion: (data: ITaskVersionCreate) => unknown;
  createVersionModal?: boolean;
}) => {
  const { colors, dark } = useAppTheme();
  const [versionName, setVersionName] = useState<string>('');
  const inputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);

  // Set initial form state
  useEffect(() => {
    if (isEdit && item) {
      setVersionName(item.name);
    } else {
      setVersionName('');
    }

    // Delay focus to ensure sheet is fully open
    const focusTimer = setTimeout(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      clearTimeout(focusTimer);
    };
  }, [isEdit, item]);

  // Use useCallback to prevent recreation of function on each render
  const handleTextChange = useCallback((text: string) => {
    setVersionName(text);
  }, []);

  // Use useCallback for submit handler
  const handleSubmit = useCallback(async () => {
    if (!versionName || versionName.trim().length <= 0) {
      return;
    }

    try {
      if (isEdit) {
        if (!item?.id) return;
        await onUpdateVersion(item.id, {
          name: versionName
        });
      } else {
        await onCreateVersion({
          name: versionName,
          color: '#FFFFFF'
        });
      }

      // Properly handle dismissal
      Keyboard.dismiss();

      // Small delay to ensure keyboard is dismissed
      setTimeout(() => {
        if (mountedRef.current) {
          onDismiss();
        }
      }, 100);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }, [isEdit, item, versionName, onUpdateVersion, onCreateVersion, onDismiss]);

  // Use useCallback for cancel handler
  const handleCancel = useCallback(() => {
    Keyboard.dismiss();

    setTimeout(() => {
      if (mountedRef.current) {
        onDismiss();
      }
    }, 100);
  }, [onDismiss]);

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 25,
        paddingTop: 26,
        paddingBottom: 40,
        height: 452
      }}
    >
      <Text style={{ ...styles.formTitle, color: colors.primary }}>
        {translate('settingScreen.versionScreen.createNewVersionText')}
      </Text>

      <TextInput
        ref={inputRef}
        style={{ ...styles.versionNameInput, color: colors.primary }}
        placeholderTextColor={'#7B8089'}
        placeholder={translate('settingScreen.versionScreen.versionNamePlaceholder')}
        value={versionName}
        onChangeText={handleTextChange}
        autoFocus={false} // Let our ref handle focus
      />

      <View style={{ ...styles.wrapButtons, marginTop: createVersionModal ? 20 : 40 }}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
        >
          <Text style={styles.cancelTxt}>{translate('settingScreen.versionScreen.cancelButtonText')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            ...styles.createBtn,
            backgroundColor: dark ? '#6755C9' : '#3826A6',
            opacity: !versionName ? 0.2 : 1
          }}
          onPress={handleSubmit}
        >
          <Text style={styles.createTxt}>
            {isEdit
              ? translate('settingScreen.versionScreen.updateButtonText')
              : translate('settingScreen.versionScreen.createButtonText')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Name the component to help with debugging
TaskVersionForm.displayName = 'TaskVersionForm';

export default TaskVersionForm;

const styles = StyleSheet.create({
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: '#E6E6E9',
    borderRadius: 12,
    height: 57,
    justifyContent: 'center',
    width: '48%'
  },
  cancelTxt: {
    color: '#1A1C1E',
    fontFamily: typography.primary.semiBold,
    fontSize: 18
  },
  createBtn: {
    alignItems: 'center',
    backgroundColor: '#3826A6',
    borderRadius: 12,
    height: 57,
    justifyContent: 'center',
    width: '48%'
  },
  createTxt: {
    color: '#FFF',
    fontFamily: typography.primary.semiBold,
    fontSize: 18
  },
  formTitle: {
    color: '#1A1C1E',
    fontFamily: typography.primary.semiBold,
    fontSize: 24
  },
  versionNameInput: {
    alignItems: 'center',
    borderColor: '#DCE4E8',
    borderRadius: 12,
    borderWidth: 1,
    height: 57,
    marginTop: 16,
    paddingHorizontal: 18,
    width: '100%'
  },
  wrapButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  }
});
