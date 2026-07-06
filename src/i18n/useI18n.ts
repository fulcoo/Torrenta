import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { translations } from './translations';

export function useI18n() {
  const appStore = useAppStore();

  const locale = computed(() => appStore.locale);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale.value];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to en if key not found in active locale
        let enValue: any = translations['en'];
        for (const enK of keys) {
          if (enValue && typeof enValue === 'object' && enK in enValue) {
            enValue = enValue[enK];
          } else {
            enValue = undefined;
            break;
          }
        }
        return typeof enValue === 'string' ? enValue : key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      let result = value;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }
      return result;
    }

    return value;
  };

  return {
    t,
    locale,
  };
}
