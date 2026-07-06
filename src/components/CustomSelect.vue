<template>
  <div class="relative w-full" ref="containerRef">
    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggleDropdown"
      :disabled="disabled"
      class="w-full bg-base-200 hover:bg-base-300/80 active:bg-base-300/90 border border-base-content/15 focus:outline-none flex items-center justify-between text-left font-bold text-xs sm:text-sm transition-all duration-200 text-base-content"
      :class="[
        size === 'sm' ? 'h-9 px-3' : 'h-10 sm:h-11 px-4',
        isOpen ? 'border-primary/50 ring-1 ring-primary/20 bg-base-300' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        buttonClass ? buttonClass : 'rounded-xl'
      ]"
    >
      <span class="truncate opacity-90" :title="labelPrefix + selectedLabel">
        <span v-if="labelPrefix" class="hidden sm:inline">{{ labelPrefix }}</span>
        {{ selectedLabel }}
      </span>
      <ChevronDownIcon class="h-4 w-4 opacity-50 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Floating Options Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 z-[100] mt-1.5 p-1 bg-base-200 border border-base-content/15 rounded-xl shadow-2xl max-h-60 overflow-y-auto w-full animate-fadeIn"
      :class="[
        placement === 'top' ? 'bottom-full mb-1.5 mt-0' : 'top-full'
      ]"
      style="--tw-bg-opacity: 1 !important; background-color: var(--b2) !important; background-color: hsl(var(--b2)) !important; background-color: oklch(var(--b2)) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; opacity: 1 !important;"
    >
      <div class="flex flex-col gap-0.5">
        <button
          v-for="opt in normalizedOptions"
          :key="opt.value"
          type="button"
          :disabled="opt.disabled"
          @click="selectOption(opt.value)"
          class="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-base-content/10 transition-colors text-xs font-semibold text-left select-none"
          :class="[
            modelValue === opt.value ? 'bg-primary/10 text-primary border border-primary/20' : 'border border-transparent text-base-content/85',
            opt.disabled ? 'opacity-40 cursor-not-allowed bg-transparent hover:bg-transparent' : ''
          ]"
        >
          <span class="truncate" :title="opt.label">{{ opt.label }}</span>
          <CheckIcon v-if="modelValue === opt.value" class="h-3.5 w-3.5 shrink-0 text-primary" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDownIcon, CheckIcon } from 'lucide-vue-next';

interface Option {
  value: any;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: any;
    options: (Option | string | { name: string; value: any; disabled?: boolean } | any)[];
    placeholder?: string;
    size?: 'sm' | 'md';
    placement?: 'top' | 'bottom';
    disabled?: boolean;
    labelPrefix?: string;
    buttonClass?: string;
  }>(),
  {
    placeholder: 'Select option...',
    size: 'md',
    placement: 'bottom',
    disabled: false,
    labelPrefix: '',
    buttonClass: '',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
  (e: 'change', val: any): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const normalizedOptions = computed((): Option[] => {
  return props.options.map((opt) => {
    if (opt && typeof opt === 'object') {
      if ('value' in opt && 'label' in opt) {
        return opt as Option;
      }
      if ('value' in opt && 'name' in opt) {
        return { value: opt.value, label: opt.name, disabled: opt.disabled };
      }
      return { value: opt.value ?? opt, label: opt.label ?? opt.name ?? String(opt), disabled: opt.disabled };
    }
    return { value: opt, label: String(opt), disabled: false };
  });
});

const selectedLabel = computed(() => {
  const match = normalizedOptions.value.find((opt) => opt.value === props.modelValue);
  return match ? match.label : props.placeholder;
});

function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function selectOption(val: any) {
  emit('update:modelValue', val);
  emit('change', val);
  isOpen.value = false;
}

function handleDocumentClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}

/* Custom scrollbars inside the list */
div::-webkit-scrollbar {
  width: 4px;
}
div::-webkit-scrollbar-track {
  background: transparent;
}
div::-webkit-scrollbar-thumb {
  background: hsla(var(--bc), 0.15);
  border-radius: 2px;
}
div::-webkit-scrollbar-thumb:hover {
  background: hsla(var(--bc), 0.25);
}
</style>
