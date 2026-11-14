import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

const IMAGE_DIR = 'images';

/**
 * Picked photos live in a temporary cache that iOS can clear at any time,
 * so copy them into the app's documents folder before saving the item.
 */
export function persistImage(uri: string): string {
  if (Platform.OS === 'web' || uri.startsWith(Paths.document.uri)) return uri;
  const dir = new Directory(Paths.document, IMAGE_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  new File(uri).copy(dest);
  return dest.uri;
}

export function deleteImage(uri: string | null) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(Paths.document.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing file is fine — nothing to clean up.
  }
}

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
};

async function fromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera access needed', 'Allow camera access in Settings to snap photos of items and receipts.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(PICK_OPTIONS);
  return result.canceled ? null : result.assets[0].uri;
}

async function fromLibrary(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  return result.canceled ? null : result.assets[0].uri;
}

/** Ask "Take photo / Choose from library", then return the picked image URI (or null). */
export function pickImage(opts: { title: string; canRemove: boolean }): Promise<string | null | 'remove'> {
  if (Platform.OS === 'web') return fromLibrary();

  return new Promise((resolve) => {
    const options = ['Take photo', 'Choose from library', ...(opts.canRemove ? ['Remove photo'] : []), 'Cancel'];
    const handle = async (index: number) => {
      if (index === 0) resolve(await fromCamera());
      else if (index === 1) resolve(await fromLibrary());
      else if (opts.canRemove && index === 2) resolve('remove');
      else resolve(null);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: opts.title,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: opts.canRemove ? 2 : undefined,
        },
        handle,
      );
    } else {
      Alert.alert(
        opts.title,
        undefined,
        options.map((text, i) => ({
          text,
          style: text === 'Cancel' ? 'cancel' : text === 'Remove photo' ? 'destructive' : 'default',
          onPress: () => handle(i),
        })),
      );
    }
  });
}
