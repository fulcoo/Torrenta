<template>
  <div class="flex flex-col gap-1 select-none font-medium">
    <div 
      v-for="node in nodes" 
      :key="node.path"
      class="flex flex-col"
    >
      <div 
        class="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-base-content/5 cursor-pointer text-xs transition-colors duration-150"
        @click="toggleNode(node)"
      >
        <!-- Icon -->
        <span class="shrink-0">
          <template v-if="node.isFolder">
            <!-- Open folder icon -->
            <FolderOpenIcon v-if="!isCollapsed(node.path)" class="h-4 w-4 text-warning" />
            <!-- Closed folder icon -->
            <FolderIcon v-else class="h-4 w-4 text-warning/80" />
          </template>
          <template v-else>
            <FileIcon class="h-4 w-4 text-info/75" />
          </template>
        </span>

        <!-- Name -->
        <span 
          class="truncate flex-1 text-base-content/90" 
          :class="node.isFolder ? 'font-bold' : 'font-mono opacity-80'"
        >
          {{ node.name }}
        </span>

        <!-- Size -->
        <span v-if="!node.isFolder && node.size !== undefined" class="text-[10px] font-mono opacity-50 shrink-0">
          {{ formatSize(node.size) }}
        </span>
      </div>

      <!-- Recursive children rendering -->
      <div 
        v-if="node.isFolder && !isCollapsed(node.path) && node.children && node.children.length > 0"
        class="pl-4 border-l border-base-content/10 ml-3.5 mt-0.5 mb-1"
      >
        <TorrentFileTree :nodes="node.children" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FolderIcon, FolderOpenIcon, FileIcon } from 'lucide-vue-next';

export interface FileTreeNode {
  name: string;
  path: string;
  size?: number;
  children?: FileTreeNode[];
  isFolder: boolean;
}

defineProps<{
  nodes: FileTreeNode[];
}>();

// Track collapsed folder paths locally per nested level
const collapsedPaths = ref<Record<string, boolean>>({});

function toggleNode(node: FileTreeNode) {
  if (node.isFolder) {
    collapsedPaths.value[node.path] = !collapsedPaths.value[node.path];
  }
}

function isCollapsed(path: string): boolean {
  return !!collapsedPaths.value[path];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>
