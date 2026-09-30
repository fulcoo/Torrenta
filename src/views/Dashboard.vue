<template>
  <div class="flex flex-col gap-6 p-4 sm:p-6 text-base-content max-w-[1600px] mx-auto h-full">
    <!-- Connection Offline Warning Banner -->
    <div 
      v-if="!torrentStore.isConnected" 
      class="bg-error/10 border border-error/30 shadow-md rounded-2xl p-4 flex flex-row items-center justify-between gap-4 text-xs font-semibold animate-fadeIn"
    >
      <div class="flex items-center gap-3 text-left">
        <AlertTriangleIcon class="h-5 w-5 text-error shrink-0 animate-pulse" />
        <div class="leading-snug">
          <span class="font-black text-red-700 dark:text-error block mb-0.5 text-sm">{{ t('dashboard.telemetryOffline') }}</span>
          <span class="font-normal text-xs text-base-content/80 block mt-0.5">{{ t('dashboard.configureToReconnect') }}</span>
        </div>
      </div>
      <a href="#/settings" class="btn btn-error btn-sm rounded-xl px-4 shadow-lg shadow-error/25 font-bold shrink-0">
        {{ t('nav.settings') }}
      </a>
    </div>


    <!-- Speed telemetry wavy area graph -->
    <div class="w-full h-[150px] shrink-0">
      <SpeedChart />
    </div>

    <!-- Main Grid Dashboard Console -->
    <div class="grid grid-cols-1 lg:grid-cols-4 items-start">
      <!-- Filter Sidebar Column (Desktop persistent, Mobile drawer popup) -->
      <aside 
        class="lg:col-span-1 transition-all duration-300 lg:block"
        :class="appStore.showMobileSidebar ? 'fixed inset-0 z-50 p-4 bg-black/60 backdrop-blur-sm flex justify-start' : 'hidden'"
        @click.self="appStore.showMobileSidebar = false"
      >
        <div 
          class="w-80 max-w-[95%] lg:w-full h-full lg:h-auto"
          :class="appStore.showMobileSidebar ? 'animate-slideRight' : ''"
        >
          <FilterSidebar
            v-model:activeStatus="activeStatus"
            v-model:activeCategory="activeCategory"
            v-model:activeTracker="activeTracker"
            v-model:activeTag="activeTag"
            v-model:activeSavePath="activeSavePath"
          />
        </div>
      </aside>

      <!-- Central Console list panel -->
      <main class="lg:col-span-3 flex flex-col gap-4 w-full">
        <!-- Control Toolbar: Actions, Search, Sort & Mobiles Toggles -->
        <div class="flex flex-row items-center justify-between gap-2.5 p-2 sm:p-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-sm">
          <!-- Left side: Select All Checkbox & Add Torrent Button -->
          <div class="flex items-center gap-2 sm:gap-3.5 shrink-0">
            <!-- Select All Checkbox -->
            <label class="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isSemiSelected"
                @change="toggleSelectAll"
                class="checkbox checkbox-primary checkbox-sm rounded-lg"
              />
              <span class="text-xs font-extrabold opacity-80 hidden sm:inline">{{ t('common.selectAll') }}</span>
            </label>

            <!-- Add Torrent Button -->
            <button
              @click="openAddModal"
              class="btn btn-primary btn-sm rounded-xl px-2.5 sm:px-4 font-bold shadow-lg shadow-primary/20 flex items-center gap-1 shrink-0"
              :title="t('dashboard.addTorrent')"
            >
              <PlusIcon class="h-4 w-4" />
              <span class="hidden sm:inline">{{ t('dashboard.addTorrent') }}</span>
            </button>
          </div>

          <!-- Sorters, Selection, Mass actions -->
          <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end flex-1">
            <!-- Sort dropdown selection -->
            <div class="flex items-center shrink-0">
              <CustomSelect
                v-model="sortBy"
                :options="sortOptions"
                :label-prefix="t('dashboard.sort.prefix')"
                size="sm"
                class="w-[85px] xs:w-[100px] sm:w-[160px]"
                button-class="rounded-l-xl rounded-r-none border-r-0"
              />
              <button
                @click="toggleSortOrder"
                class="h-9 px-2.5 sm:px-3 bg-base-200 hover:bg-base-300/80 active:bg-base-300/90 border border-base-content/15 rounded-r-xl rounded-l-none flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 text-base-content shrink-0"
                :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
              >
                <SortAscIcon v-if="sortOrder === 'asc'" class="h-4 w-4 opacity-75" />
                <SortDescIcon v-else class="h-4 w-4 opacity-75" />
              </button>
            </div>

            <!-- Global Action / Selection Triggers -->
            <div class="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 shrink-0">
              <template v-if="selectedIds.length === 0">
                <button
                  @click="pauseAll"
                  class="btn btn-neutral btn-sm rounded-xl px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 shrink-0"
                  :title="t('dashboard.pauseAll')"
                >
                  <PauseIcon class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('dashboard.pauseAll') }}</span>
                </button>
                <button
                  @click="resumeAll"
                  class="btn btn-neutral btn-sm rounded-xl px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 shrink-0"
                  :title="t('dashboard.resumeAll')"
                >
                  <PlayIcon class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('dashboard.resumeAll') }}</span>
                </button>
              </template>
              
              <template v-else>
                <!-- Selected count indicator -->
                <div class="flex items-center gap-1 mr-1 text-xs font-bold text-primary animate-fadeIn select-none shrink-0">
                  <span class="hidden xs:inline">{{ t('dashboard.selectedCount', { count: selectedIds.length }) }}</span>
                  <span class="xs:hidden">{{ selectedIds.length }}</span>
                  <button @click="clearSelection" class="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:bg-base-content/10 h-6 w-6 min-h-[24px]" title="Clear Selection">
                    <XIcon class="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  @click="pauseSelected"
                  class="btn btn-neutral btn-sm rounded-xl px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 animate-fadeIn shrink-0"
                  :title="t('dashboard.pause')"
                >
                  <PauseIcon class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('dashboard.pause') }}</span>
                </button>
                <button
                  @click="resumeSelected"
                  class="btn btn-neutral btn-sm rounded-xl px-2.5 sm:px-3 font-semibold text-xs flex items-center gap-1 animate-fadeIn shrink-0"
                  :title="t('dashboard.resume')"
                >
                  <PlayIcon class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('dashboard.resume') }}</span>
                </button>
                <button
                  @click="openDeleteModal(selectedIds)"
                  class="btn btn-ghost btn-sm rounded-xl text-error hover:bg-error/15 h-9 font-bold flex items-center gap-1.5 px-3 shrink-0"
                  :title="t('common.remove')"
                >
                  <Trash2Icon class="h-4 w-4" />
                  <span class="hidden sm:inline">{{ t('common.remove') }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Master List Panel -->
        <div class="flex flex-col gap-3">
          <!-- Card grid scrollable container -->
          <div 
            v-if="paginatedTorrents.length > 0" 
            class="overflow-y-auto pr-1 flex flex-col gap-2 max-h-[60vh] lg:max-h-[1200px] scrollbar-thin"
          >
            <TorrentCard
              v-for="t in paginatedTorrents"
              :key="t.id"
              :torrent="t"
              :selected="selectedIds.includes(t.id)"
              @toggle-select="toggleSelect(t.id)"
              @pause="torrentStore.pauseTorrents([t.id])"
              @resume="torrentStore.resumeTorrents([t.id])"
              @delete="openDeleteModal([t.id])"
              @click-card="selectedDetailTorrent = t"
              @contextmenu.prevent="openContextMenu($event, t)"
            />
          </div>

          <!-- Empty Screen state -->
          <div
            v-else
            class="card bg-base-100 shadow-md rounded-2xl p-10 text-center flex flex-col items-center justify-center border border-base-content/10 gap-3 min-h-[250px]"
          >
            <InboxIcon class="h-12 w-12 opacity-30 text-neutral-content animate-pulse" />
            <div>
              <h3 class="font-bold text-lg">{{ t('dashboard.noTorrents') }}</h3>
              <p class="text-xs opacity-50 mt-1">{{ t('dashboard.noTorrentsDesc') }}</p>
            </div>
            <button 
              v-if="activeStatus !== 'all' || activeCategory !== '' || activeTracker !== '' || activeTag !== '' || activeSavePath !== '' || torrentStore.searchQuery !== ''"
              @click="clearFilters" 
              class="btn btn-neutral btn-xs rounded-lg mt-1"
            >
              {{ t('dashboard.resetFilters') }}
            </button>
          </div>

          <!-- Pagination Bar -->
          <div 
            v-if="filteredTorrents.length > 0" 
            class="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-sm mt-1 text-xs font-bold text-base-content/85 select-none animate-fadeIn"
          >
            <!-- Total count & Page size selector -->
            <div class="flex items-center gap-3">
              <span>{{ t('dashboard.pagination.total') }} {{ filteredTorrents.length }} {{ t('dashboard.pagination.items') }}</span>
              <div class="flex items-center gap-1.5">
                <span class="opacity-60">{{ t('dashboard.pagination.pageSize') }}:</span>
                <select 
                  v-model="pageSize" 
                  class="select select-bordered select-xs rounded-lg bg-base-200 text-xs font-bold focus:outline-none focus:border-primary border-base-content/10 h-7 min-h-[28px]"
                >
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                </select>
              </div>
            </div>

            <!-- Page navigation & Jump to page -->
            <div class="flex flex-wrap items-center justify-center gap-4">
              <!-- Pagination Buttons -->
              <div class="join border border-base-content/10 rounded-xl overflow-hidden">
                <button 
                  @click="currentPage = 1" 
                  :disabled="currentPage === 1" 
                  class="join-item btn btn-xs btn-neutral h-7 min-h-[28px] px-2 font-black"
                >
                  &laquo;
                </button>
                <button 
                  @click="currentPage = Math.max(1, currentPage - 1)" 
                  :disabled="currentPage === 1" 
                  class="join-item btn btn-xs btn-neutral h-7 min-h-[28px] px-2 font-black"
                >
                  &lsaquo;
                </button>
                <span class="join-item btn btn-xs btn-disabled bg-base-200 text-base-content/75 font-bold px-3 h-7 min-h-[28px]">
                  {{ currentPage }} / {{ totalPages }}
                </span>
                <button 
                  @click="currentPage = Math.min(totalPages, currentPage + 1)" 
                  :disabled="currentPage === totalPages" 
                  class="join-item btn btn-xs btn-neutral h-7 min-h-[28px] px-2 font-black"
                >
                  &rsaquo;
                </button>
                <button 
                  @click="currentPage = totalPages" 
                  :disabled="currentPage === totalPages" 
                  class="join-item btn btn-xs btn-neutral h-7 min-h-[28px] px-2 font-black"
                >
                  &raquo;
                </button>
              </div>

              <!-- Jump to page input -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-60">{{ t('dashboard.pagination.jumpTo') }}</span>
                <input 
                  type="number" 
                  v-model.number="jumpPageInput" 
                  @keyup.enter="jumpToPage" 
                  min="1" 
                  :max="totalPages" 
                  class="input input-bordered input-xs w-11 h-7 min-h-[28px] text-center rounded-lg bg-base-200 focus:outline-none focus:border-primary font-bold border-base-content/10"
                />
                <span class="opacity-60">{{ t('dashboard.pagination.pageUnit') }}</span>
                <button 
                  @click="jumpToPage" 
                  class="btn btn-neutral btn-xs rounded-lg font-bold h-7 min-h-[28px] px-2.5"
                >
                  {{ t('dashboard.pagination.go') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Custom Glassmorphic Removal Dialog Modal -->
    <dialog :open="showDeleteModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showDeleteModal }">
      <div class="modal-box bg-base-100 border border-base-content/10 max-w-sm rounded-2xl p-6 shadow-2xl">
        <h3 class="font-black text-lg text-error flex items-center gap-2">
          <AlertTriangleIcon class="h-5.5 w-5.5" /> {{ t('dashboard.removeTitle') }}
        </h3>
        <p class="py-4 text-xs font-semibold leading-relaxed opacity-80">
          <span v-if="deleteTargetName" v-html="t('torrent.confirmDeleteSingle', { name: `<strong>${deleteTargetName}</strong>` })"></span>
          <span v-else>{{ t('dashboard.removeConfirm', { count: idsToDelete.length }) }}</span>
        </p>
        
        <!-- Toggle disk data checkbox -->
        <div class="form-control mb-4">
          <label class="label cursor-pointer justify-start gap-3 select-none">
            <input 
              type="checkbox" 
              v-model="deleteFilesFromDisk" 
              class="checkbox checkbox-error checkbox-sm transition-transform duration-150 active:scale-90" 
            />
            <span class="label-text font-extrabold text-xs text-error">
              {{ t('dashboard.deleteFromDisk') }}
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="modal-action gap-2 justify-end">
          <button @click="closeDeleteModal" class="btn btn-ghost btn-sm rounded-xl">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmDelete" class="btn btn-error btn-sm rounded-xl px-4 shadow-lg shadow-error/25 font-bold">
            {{ t('common.remove') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Custom Glassmorphic Duplicate Warning Dialog Modal -->
    <dialog :open="showDuplicateModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showDuplicateModal }">
      <div class="modal-box bg-base-100 border border-base-content/10 max-w-sm rounded-2xl p-6 shadow-2xl">
        <h3 class="font-black text-lg text-warning flex items-center gap-2">
          <CopyIcon class="h-5.5 w-5.5 text-warning" /> {{ t('settings.duplicateTorrentTitle') }}
        </h3>
        <p class="py-4 text-xs font-semibold leading-relaxed opacity-85 text-left select-none">
          {{ t('settings.duplicateTorrentPrompt', { name: duplicateNamesString }) }}
        </p>
        
        <!-- Actions -->
        <div class="modal-action gap-2 justify-end">
          <button @click="showDuplicateModal = false" class="btn btn-ghost btn-sm rounded-xl">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmAddWithNoMerge" class="btn btn-neutral btn-sm rounded-xl font-bold">
            {{ t('settings.dontMerge') }}
          </button>
          <button @click="confirmAddWithMerge" class="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/25 font-bold">
            {{ t('settings.mergeTrackers') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Custom Glassmorphic Torrent Details Dialog Modal -->
    <dialog :open="!!selectedDetailTorrent" class="modal bg-black/60 z-50" :class="{ 'modal-open': !!selectedDetailTorrent }">
      <div v-if="selectedDetailTorrent" class="modal-box bg-base-100 border border-base-content/10 max-w-2xl rounded-2xl p-6 shadow-2xl relative transition-all duration-300">
        <!-- Close Button -->
        <button type="button" @click="selectedDetailTorrent = null" class="btn btn-ghost btn-xs btn-circle absolute right-4 top-4 hover:bg-base-content/10">
          <XIcon class="h-4 w-4" />
        </button>

        <h3 class="font-black text-lg flex items-center gap-2 text-primary pr-8">
          <InfoIcon class="h-5.5 w-5.5 text-primary" /> {{ t('torrent.detailsTitle') }}
        </h3>
        
        <div class="mt-4 flex flex-col gap-4 text-xs text-base-content select-none">
          <!-- Torrent Name Banner -->
          <div class="bg-base-200/50 border border-base-content/5 p-3 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.detailName') }}</span>
            <span class="font-extrabold text-sm text-base-content truncate break-all block" :title="selectedDetailTorrent.name">
              {{ selectedDetailTorrent.name }}
            </span>
          </div>

          <!-- Loading state if properties are not fetched yet -->
          <div v-if="!detailProperties" class="flex flex-col items-center justify-center py-10 gap-3">
            <span class="loading loading-ring loading-md text-primary"></span>
            <span class="text-xs opacity-50">{{ t('torrent.loadingDetails') }}</span>
          </div>

          <!-- Complete detailed fields if fetched -->
          <div v-else class="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            
            <!-- Section 1: 传输活动 (Transfer Stats) -->
            <div>
              <h4 class="font-black text-[11px] uppercase tracking-wider text-primary border-b border-base-content/10 pb-1.5 mb-2.5">
                {{ t('torrent.transferStats') }}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 leading-relaxed">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.downloadedDetail') }}</span>
                  <span class="font-bold text-base-content/95">
                    {{ formatSize(detailProperties.total_downloaded) }}
                    <span class="text-[10px] opacity-50 font-normal ml-1">
                      {{ t('torrent.sessionDetail', { size: formatSize(detailProperties.total_downloaded_session) }) }}
                    </span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.uploadedDetail') }}</span>
                  <span class="font-bold text-base-content/95">
                    {{ formatSize(detailProperties.total_uploaded) }}
                    <span class="text-[10px] opacity-50 font-normal ml-1">
                      {{ t('torrent.sessionDetail', { size: formatSize(detailProperties.total_uploaded_session) }) }}
                    </span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.dlSpeedDetail') }}</span>
                  <span class="font-bold text-base-content/95 flex items-center gap-1 font-mono text-primary">
                    <ArrowDownIcon class="h-3.5 w-3.5" />
                    {{ formatSpeed(selectedDetailTorrent.downloadSpeed) }}
                    <span class="text-[10px] opacity-50 font-normal ml-1 text-base-content">
                      {{ t('torrent.avgSpeedDetail', { speed: formatSpeed(detailProperties.average_download_speed) }) }}
                    </span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.upSpeedDetail') }}</span>
                  <span class="font-bold text-base-content/95 flex items-center gap-1 font-mono text-secondary">
                    <ArrowUpIcon class="h-3.5 w-3.5" />
                    {{ formatSpeed(selectedDetailTorrent.uploadSpeed) }}
                    <span class="text-[10px] opacity-50 font-normal ml-1 text-base-content">
                      {{ t('torrent.avgSpeedDetail', { speed: formatSpeed(detailProperties.average_upload_speed) }) }}
                    </span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.dlLimitDetail') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatLimit(detailProperties.dl_limit) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.upLimitDetail') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatLimit(detailProperties.up_limit) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.shareRatioDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">{{ detailProperties.share_ratio.toFixed(2) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.popularityDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">
                    {{ (detailProperties.peers_total > 0 ? (detailProperties.seeds_total / detailProperties.peers_total) : 0).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Section 2: 集群与连接 (Swarm & Connections) -->
            <div class="pt-2 border-t border-base-content/5">
              <h4 class="font-black text-[11px] uppercase tracking-wider text-primary border-b border-base-content/10 pb-1.5 mb-2.5">
                {{ t('torrent.swarmConnections') }}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 leading-relaxed">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.seedsDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">
                    {{ detailProperties.seeds }} <span class="opacity-50">{{ t('torrent.totalDetail', { total: detailProperties.seeds_total }) }}</span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.peersDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">
                    {{ detailProperties.peers }} <span class="opacity-50">{{ t('torrent.totalDetail', { total: detailProperties.peers_total }) }}</span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.connectionsDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">
                    {{ detailProperties.peers + detailProperties.seeds }} 
                    <span class="opacity-50">{{ t('torrent.maxDetail', { max: detailProperties.connection_limit > 0 ? detailProperties.connection_limit : '∞' }) }}</span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.wastedDetail') }}</span>
                  <span class="font-bold text-base-content/95 font-mono">{{ formatSize(detailProperties.total_wasted) }}</span>
                </div>
              </div>
            </div>

            <!-- Section 3: 时间与活动 (Time & Duration) -->
            <div class="pt-2 border-t border-base-content/5">
              <h4 class="font-black text-[11px] uppercase tracking-wider text-primary border-b border-base-content/10 pb-1.5 mb-2.5">
                {{ t('torrent.timeActivity') }}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 leading-relaxed">
                <div class="flex flex-col gap-0.5 col-span-1 sm:col-span-2">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.elapsedTimeDetail') }}</span>
                  <span class="font-bold text-base-content/95">
                    {{ formatDuration(detailProperties.time_elapsed) }}
                    <span v-if="detailProperties.seeding_time > 0" class="text-[10px] opacity-50 font-normal ml-1">
                      {{ t('torrent.seedingTimeDetail', { time: formatDuration(detailProperties.seeding_time) }) }}
                    </span>
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.lastSeenComplete') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatDate(detailProperties.last_seen) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.addedDateDetail') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatDate(detailProperties.addition_date) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.completedDateDetail') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatDate(detailProperties.completion_date) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.createdDate') }}</span>
                  <span class="font-bold text-base-content/95">{{ formatDate(detailProperties.creation_date) }}</span>
                </div>
                <div class="flex flex-col gap-0.5 col-span-1 sm:col-span-2">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.createdByDetail') }}</span>
                  <span class="font-bold text-base-content/90 break-all select-text" :title="detailProperties.created_by">
                    {{ detailProperties.created_by || 'Unknown' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Section 4: 静态元数据 (Static Metadata) -->
            <div class="pt-2 border-t border-base-content/5">
              <h4 class="font-black text-[11px] uppercase tracking-wider text-primary border-b border-base-content/10 pb-1.5 mb-2.5">
                {{ t('torrent.metadataDetail') }}
              </h4>
              <div class="flex flex-col gap-3.5 leading-relaxed">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.piecesDetail') }}</span>
                    <span class="font-bold text-base-content/90 font-mono">
                      {{ formatPieces(detailProperties.num_pieces, detailProperties.piece_size) }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.privateLevel') }}</span>
                    <span class="font-bold text-base-content/90">{{ formatPrivate(detailProperties.is_private) }}</span>
                  </div>
                </div>

                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.savePath').split(':')[0] }}</span>
                  <span class="font-bold text-xs text-base-content/90 break-all bg-base-200/20 px-2 py-1 rounded border border-base-content/5 font-mono" :title="detailProperties.save_path">
                    {{ detailProperties.save_path }}
                  </span>
                </div>

                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.commentDetail') }}</span>
                  <span v-if="detailProperties.comment && detailProperties.comment.startsWith('http')" class="font-bold text-xs text-primary break-all">
                    <a :href="detailProperties.comment" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-1 font-mono">
                      {{ detailProperties.comment }}
                    </a>
                  </span>
                  <span v-else class="font-bold text-xs text-base-content/80 break-all bg-base-200/20 px-2 py-1 rounded border border-base-content/5 font-mono">
                    {{ detailProperties.comment || t('torrent.noComment') }}
                  </span>
                </div>

                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.infoHashV1') }}</span>
                  <span class="font-bold text-[10px] text-base-content/75 select-text bg-base-200/25 px-2 py-1 rounded border border-base-content/5 break-all font-mono">
                    {{ selectedDetailTorrent.id }}
                  </span>
                </div>

                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] font-bold opacity-45 uppercase tracking-wider">{{ t('torrent.infoHashV2') }}</span>
                  <span class="font-bold text-[10px] text-base-content/50 select-text bg-base-200/25 px-2 py-1 rounded border border-base-content/5 break-all font-mono">
                    N/A
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Action Footer -->
        <div class="modal-action gap-2 justify-end mt-4">
          <button @click="selectedDetailTorrent = null" class="btn btn-neutral btn-sm rounded-xl px-4 font-bold">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Custom Glassmorphic Add Torrent Dialog Modal -->
    <dialog :open="showAddModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showAddModal }">
      <div 
        class="modal-box bg-base-100 border border-base-content/10 rounded-2xl p-6 shadow-2xl relative transition-all duration-300"
        :class="selectedFiles.length > 0 ? 'max-w-lg lg:max-w-4xl w-full' : 'max-w-lg w-full'"
      >
        <button type="button" @click="closeAddModal" class="btn btn-ghost btn-xs btn-circle absolute right-4 top-4 hover:bg-base-content/10">
          <XIcon class="h-4 w-4" />
        </button>

        <h3 class="font-black text-lg flex items-center gap-2 text-primary">
          <PlusCircleIcon class="h-5.5 w-5.5" /> {{ t('dashboard.addTorrent') }}
        </h3>
        
        <div class="flex flex-col lg:flex-row gap-6 mt-4">
          <!-- Left Column: Form Settings -->
          <div class="flex-1 flex flex-col gap-4 text-left min-w-0">
            <!-- Tab selector for URL vs File -->
            <div class="tabs tabs-boxed bg-base-200 p-1 rounded-xl flex">
              <button 
                type="button"
                @click="addType = 'file'" 
                class="tab tab-sm rounded-lg flex-1 font-bold transition-all h-8"
                :class="addType === 'file' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/60 hover:text-base-content'"
              >
                {{ t('dashboard.torrentFiles') }}
              </button>
              <button 
                type="button"
                @click="addType = 'url'" 
                class="tab tab-sm rounded-lg flex-1 font-bold transition-all h-8"
                :class="addType === 'url' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/60 hover:text-base-content'"
              >
                {{ t('dashboard.linksMagnets') }}
              </button>
            </div>

            <!-- URL input -->
            <div v-if="addType === 'url'" class="form-control w-full animate-fadeIn">
              <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.linksMagnets') }}</label>
              <textarea
                v-model="addForm.urls"
                :placeholder="t('dashboard.magnetPlaceholder')"
                rows="4"
                class="textarea textarea-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary font-mono text-xs leading-relaxed p-3"
              ></textarea>
            </div>

            <!-- File selector -->
            <div v-else class="form-control w-full animate-fadeIn">
              <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.torrentFiles') }}</label>
              <div 
                class="border-2 border-dashed border-base-content/20 hover:border-primary/50 transition-colors rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 bg-base-200/50"
                @click="triggerFileInput"
                @dragover.prevent
                @drop.prevent="handleFileDrop"
              >
                <UploadIcon class="h-8 w-8 opacity-40 text-primary animate-pulse" />
                <div class="text-xs font-bold">
                  <span class="text-primary hover:underline">{{ t('dashboard.clickToBrowse') }}</span> {{ t('dashboard.dragDropTip') }}
                </div>
                <div v-if="selectedFiles.length > 0" class="text-[10px] text-success font-semibold mt-1">
                  {{ t('dashboard.selectedFiles', { count: selectedFiles.length }) }}
                </div>
                <div v-else class="text-[10px] opacity-40">{{ t('dashboard.supportsTorrents') }}</div>
              </div>
              <input 
                ref="fileInputRef" 
                type="file" 
                accept=".torrent" 
                multiple 
                class="hidden" 
                @change="handleFileChange" 
              />

              <!-- Selected Files List -->
              <div v-if="selectedFiles.length > 0" class="flex flex-col gap-1.5 mt-2 max-h-24 overflow-y-auto bg-base-200/50 p-2 rounded-xl border border-base-content/5">
                <div v-for="(file, idx) in selectedFiles" :key="idx" class="flex items-center justify-between text-[10px] font-mono opacity-80 border-b border-base-content/5 pb-1 last:border-0 last:pb-0">
                  <span class="truncate pr-4">{{ file.name }} ({{ formatSize(file.size) }})</span>
                  <button type="button" @click.stop="removeSelectedFile(idx)" class="btn btn-ghost btn-xs btn-circle h-4 w-4 min-h-[16px] text-error hover:bg-error/10">
                    <XIcon class="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Category selection -->
            <div class="form-control w-full">
              <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.category') }}</label>
              <CustomSelect v-model="addForm.category" :options="addCategoryOptions" />
            </div>

            <!-- Save Path Directory selection (Conditional based on Category) -->
            <!-- 1. Category selected and has paths: show custom select -->
            <div v-if="addForm.category && categoryPathsOptions.length > 0" class="form-control w-full">
              <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.savePath') }}</label>
              <CustomSelect v-model="addForm.savepath" :options="categoryPathsOptions" :disabled="addForm.autoTMM" />
            </div>

            <!-- 2. Category selected but has NO paths: show info block -->
            <div v-else-if="addForm.category && categoryPathsOptions.length === 0" class="p-3.5 bg-warning/10 border border-warning/20 rounded-xl text-xs text-warning leading-snug animate-fadeIn text-left">
              {{ t('dashboard.noPathConfigured') }}
            </div>

            <!-- 3. No Category selected (Unclassified): show text input for manual entry -->
            <div v-else class="form-control w-full animate-fadeIn">
              <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.manualPath') }}</label>
              <input
                v-model="addForm.savepath"
                type="text"
                :disabled="addForm.autoTMM"
                :placeholder="t('dashboard.manualPathPlaceholder')"
                class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10 disabled:opacity-50"
              />
              <p class="text-[10px] opacity-50 mt-1">{{ t('dashboard.unclassifiedTip') }}</p>
            </div>

            <!-- Extra checkboxes (Grid) -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              <!-- Start paused -->
              <label class="label cursor-pointer justify-start gap-2.5 select-none py-1">
                <input type="checkbox" v-model="addForm.paused" class="checkbox checkbox-primary checkbox-xs rounded animate-fadeIn" />
                <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.startPaused') }}</span>
              </label>

              <!-- Skip checking -->
              <label class="label cursor-pointer justify-start gap-2.5 select-none py-1">
                <input type="checkbox" v-model="addForm.skip_checking" class="checkbox checkbox-primary checkbox-xs rounded animate-fadeIn" />
                <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.skipChecking') }}</span>
              </label>

              <!-- Sequential download -->
              <label class="label cursor-pointer justify-start gap-2.5 select-none py-1">
                <input type="checkbox" v-model="addForm.sequentialDownload" class="checkbox checkbox-primary checkbox-xs rounded animate-fadeIn" />
                <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.sequentialDownload') }}</span>
              </label>

              <!-- First Last piece priority -->
              <label class="label cursor-pointer justify-start gap-2.5 select-none py-1">
                <input type="checkbox" v-model="addForm.firstLastAsStream" class="checkbox checkbox-primary checkbox-xs rounded animate-fadeIn" />
                <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.firstLastPiece') }}</span>
              </label>
            </div>

            <!-- Toggle Advanced Options Button -->
            <div class="mt-2 flex justify-start">
              <button 
                type="button" 
                @click="showAdvancedOptions = !showAdvancedOptions"
                class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 rounded-lg flex items-center gap-1"
              >
                <span>{{ showAdvancedOptions ? t('dashboard.hideAdvanced') : t('dashboard.showAdvanced') }}</span>
              </button>
            </div>

            <!-- Advanced Options Panel -->
            <div v-if="showAdvancedOptions" class="flex flex-col gap-4 mt-3 pt-4 border-t border-base-content/10 animate-fadeIn text-left">
              <!-- Toggles Grid -->
              <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                <!-- Automatic Torrent Management (TMM) -->
                <label class="label cursor-pointer justify-start gap-2.5 select-none py-1" :title="t('dashboard.autoTMMDesc')">
                  <input type="checkbox" v-model="addForm.autoTMM" class="checkbox checkbox-secondary checkbox-xs rounded animate-fadeIn" />
                  <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.autoTMM') }}</span>
                </label>

                <!-- Add to top of queue -->
                <label class="label cursor-pointer justify-start gap-2.5 select-none py-1" :title="t('dashboard.addToTopOfQueueDesc')">
                  <input type="checkbox" v-model="addForm.addToTopOfQueue" class="checkbox checkbox-secondary checkbox-xs rounded animate-fadeIn" />
                  <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.addToTopOfQueue') }}</span>
                </label>

                <!-- Forced start -->
                <label class="label cursor-pointer justify-start gap-2.5 select-none py-1" :title="t('dashboard.forcedDesc')">
                  <input type="checkbox" v-model="addForm.forced" class="checkbox checkbox-secondary checkbox-xs rounded animate-fadeIn" />
                  <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.forced') }}</span>
                </label>

                <!-- Use temporary download path -->
                <label class="label cursor-pointer justify-start gap-2.5 select-none py-1" :title="t('dashboard.downloadPath')">
                  <input type="checkbox" v-model="addForm.useDownloadPath" class="checkbox checkbox-secondary checkbox-xs rounded animate-fadeIn" />
                  <span class="label-text text-xs opacity-80 font-semibold">{{ t('dashboard.downloadPath') }}</span>
                </label>
              </div>

              <!-- Rename & Tags & Temp Path Inputs -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.rename') }}</label>
                  <input
                    v-model="addForm.rename"
                    type="text"
                    :placeholder="t('dashboard.renamePlaceholder')"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.tags') }}</label>
                  <input
                    v-model="addForm.tags"
                    type="text"
                    :placeholder="t('dashboard.tagsPlaceholder')"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>

                <!-- Custom Temp Download Path input (enabled only if useDownloadPath is checked) -->
                <div v-if="addForm.useDownloadPath" class="form-control w-full md:col-span-2 animate-fadeIn">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.downloadPath') }}</label>
                  <input
                    v-model="addForm.downloadPath"
                    type="text"
                    :placeholder="t('dashboard.downloadPathPlaceholder')"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>
              </div>

              <!-- Dropdowns Grid (Content Layout & Stop Condition) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.contentLayout') }}</label>
                  <CustomSelect 
                    v-model="addForm.contentLayout" 
                    :options="contentLayoutOptions" 
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.stopCondition') }}</label>
                  <CustomSelect 
                    v-model="addForm.stopCondition" 
                    :options="stopConditionOptions" 
                  />
                </div>
              </div>

              <!-- Limits Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.dlLimit') }}</label>
                  <input
                    v-model="addForm.dlLimit"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.upLimit') }}</label>
                  <input
                    v-model="addForm.upLimit"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.ratioLimit') }}</label>
                  <input
                    v-model="addForm.ratioLimit"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Unlimited"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75">{{ t('dashboard.seedingTimeLimit') }}</label>
                  <input
                    v-model="addForm.seedingTimeLimit"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
                  />
                </div>
              </div>
            </div>

            <!-- Actions footer within left column -->
            <div class="modal-action gap-2 justify-end mt-6">
              <button type="button" @click="closeAddModal" class="btn btn-ghost btn-sm rounded-xl">
                {{ t('common.cancel') }}
              </button>
              <button 
                type="button"
                @click="submitAdd" 
                :disabled="isSubmitting || (addType === 'url' ? !addForm.urls.trim() : selectedFiles.length === 0)"
                class="btn btn-primary btn-sm rounded-xl px-6 shadow-lg shadow-primary/20 font-bold"
              >
                <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
                {{ t('dashboard.addTorrent') }}
              </button>
            </div>
          </div>

          <!-- Right Column: File Preview (desktop only, hidden on mobile) -->
          <div 
            v-if="selectedFiles.length > 0" 
            class="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-base-content/10 pl-6 max-h-[520px] animate-fadeIn"
          >
            <h4 class="font-bold text-xs uppercase opacity-75 mb-3 tracking-wider flex items-center gap-1.5 text-secondary">
              <FileIcon class="h-4 w-4 text-primary" /> {{ t('dashboard.filePreview') }}
            </h4>

            <!-- Selector if multiple torrents selected -->
            <div v-if="parsedTorrents.length > 1" class="mb-3">
              <label class="text-[10px] uppercase font-bold opacity-60 block mb-1">
                {{ t('dashboard.fileTree') }}
              </label>
              <CustomSelect 
                v-model="activePreviewIndex" 
                :options="torrentPreviewOptions"
                size="sm"
                class="rounded-xl"
              />
            </div>

            <!-- Scrollable File Tree Preview -->
            <div class="flex-1 overflow-y-auto pr-1 scrollbar-thin max-h-[460px]">
              <TorrentFileTree 
                v-if="activeFileTree.length > 0" 
                :nodes="activeFileTree" 
              />
              <div 
                v-else 
                class="text-xs text-base-content/50 italic py-8 text-center"
              >
                {{ t('dashboard.noPreviewAvailable') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
    <!-- Custom Premium Context Menu -->
    <div
      v-if="contextMenu.show"
      class="fixed z-[100] w-56 bg-base-200 border border-base-content/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 animate-fadeIn select-none text-xs font-semibold"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <!-- Option: Play / Pause -->
      <button 
        @click="handleContextAction('toggle-play')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-left text-base-content"
      >
        <component :is="contextMenuTorrent?.status === 'paused' ? PlayIcon : PauseIcon" class="h-4 w-4 opacity-70" />
        <span>{{ contextMenuTorrent?.status === 'paused' ? t('torrent.start') : t('torrent.stop') }}</span>
      </button>

      <!-- Option: Force Start -->
      <button 
        @click="handleContextAction('force-start')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-left text-base-content"
      >
        <ZapIcon class="h-4 w-4 opacity-70 text-warning animate-pulse" />
        <span>{{ t('torrent.forceStart') }}</span>
      </button>

      <!-- Option: Rename -->
      <button 
        @click="handleContextAction('rename')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-left text-base-content"
      >
        <Edit2Icon class="h-4 w-4 opacity-70" />
        <span>{{ t('torrent.rename') }}</span>
      </button>

      <!-- Option: Change Location -->
      <button 
        @click="handleContextAction('change-path')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-left text-base-content"
      >
        <FolderOpenIcon class="h-4 w-4 opacity-70" />
        <span>{{ t('torrent.changeSavePath') }}</span>
      </button>

      <!-- Option: Edit Tracker -->
      <button 
        @click="handleContextAction('edit-tracker')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-left text-base-content"
      >
        <GlobeIcon class="h-4 w-4 opacity-70" />
        <span>{{ t('torrent.editTracker') }}</span>
      </button>

      <div class="h-px bg-base-content/10 my-1"></div>

      <!-- Option: Tags (with Hover Submenu) -->
      <div class="relative group/submenu">
        <div 
          class="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl hover:bg-base-content/10 text-base-content cursor-pointer"
        >
          <div class="flex items-center gap-2.5">
            <TagIcon class="h-4 w-4 opacity-70" />
            <span>{{ t('torrent.tags') }}</span>
          </div>
          <ChevronRightIcon class="h-3.5 w-3.5 opacity-60" />
        </div>

        <!-- Submenu panel (Visible on hover) -->
        <div 
          class="absolute left-full top-0 ml-1.5 w-52 bg-base-200 border border-base-content/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 opacity-0 invisible group-hover/submenu:opacity-100 group-hover/submenu:visible transition-all duration-200 z-[110]"
        >
          <!-- Submenu header actions: Add, Remove All -->
          <div class="flex items-center justify-between border-b border-base-content/10 pb-1.5 mb-1.5 px-1">
            <button 
              @click="handleContextAction('add-tag')" 
              class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 rounded-lg px-2 h-6"
            >
              + {{ t('torrent.addTag') }}
            </button>
            <button 
              @click="handleContextAction('remove-all-tags')" 
              class="btn btn-ghost btn-xs text-error font-bold hover:bg-error/10 rounded-lg px-2 h-6"
              :disabled="!contextMenuTorrent?.tags || contextMenuTorrent.tags.length === 0"
            >
              {{ t('torrent.removeAllTags') }}
            </button>
          </div>

          <!-- Tags list with checkboxes -->
          <div class="max-h-48 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
            <label 
              v-for="tag in allTags" 
              :key="tag" 
              class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-base-content/5 cursor-pointer text-[11px]"
            >
              <input 
                type="checkbox" 
                :checked="isTagSelected(tag)" 
                @change="toggleTorrentTag(tag, $event)"
                class="checkbox checkbox-primary checkbox-xs border-base-content/30"
              />
              <span class="truncate" :title="tag">{{ tag }}</span>
            </label>
            <div v-if="allTags.length === 0" class="text-[10px] text-base-content/40 italic py-2 text-center select-none">
              {{ t('torrent.noTagsCreated') }}
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-base-content/10 my-1"></div>

      <!-- Option: Delete -->
      <button 
        @click="handleContextAction('delete')" 
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-error/10 hover:text-error text-left text-error font-bold"
      >
        <Trash2Icon class="h-4 w-4 shrink-0" />
        <span>{{ t('common.remove') }}</span>
      </button>
    </div>

    <!-- Custom Glassmorphic Rename Dialog Modal -->
    <dialog :open="showRenameModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showRenameModal }">
      <div class="modal-box bg-base-100 border border-base-content/10 max-w-sm rounded-2xl p-6 shadow-2xl">
        <h3 class="font-black text-lg text-primary flex items-center gap-2">
          <Edit2Icon class="h-5.5 w-5.5 text-primary" /> {{ t('torrent.rename') }}
        </h3>
        <div class="form-control w-full mt-4">
          <label class="label font-bold text-xs uppercase opacity-75">{{ t('torrent.confirmRename') }}</label>
          <input
            v-model="renameForm.name"
            type="text"
            class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
            :placeholder="t('torrent.renamePlaceholder')"
          />
        </div>
        <!-- Actions -->
        <div class="modal-action gap-2 justify-end mt-6">
          <button @click="showRenameModal = false" class="btn btn-ghost btn-sm rounded-xl">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmRename" :disabled="!renameForm.name.trim()" class="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/25 font-bold">
            {{ t('torrent.confirm') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Custom Glassmorphic Change Location Dialog Modal -->
    <dialog :open="showChangePathModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showChangePathModal }">
      <div class="modal-box bg-base-100 border border-base-content/10 max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 class="font-black text-lg text-primary flex items-center gap-2">
          <FolderOpenIcon class="h-5.5 w-5.5 text-primary" /> {{ t('torrent.changeSavePath') }}
        </h3>
        <div class="form-control w-full mt-4">
          <label class="label font-bold text-xs uppercase opacity-75">{{ t('torrent.confirmLocation') }}</label>
          <input
            v-model="changePathForm.path"
            type="text"
            class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
            :placeholder="t('torrent.locationPlaceholder')"
          />
        </div>
        <!-- Actions -->
        <div class="modal-action gap-2 justify-end mt-6">
          <button @click="showChangePathModal = false" class="btn btn-ghost btn-sm rounded-xl">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmChangePath" :disabled="!changePathForm.path.trim()" class="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/25 font-bold">
            {{ t('torrent.confirm') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Custom Glassmorphic Add Tag Dialog Modal -->
    <dialog :open="showAddTagModal" class="modal bg-black/60 z-50" :class="{ 'modal-open': showAddTagModal }">
      <div class="modal-box bg-base-100 border border-base-content/10 max-w-sm rounded-2xl p-6 shadow-2xl">
        <h3 class="font-black text-lg text-primary flex items-center gap-2">
          <TagIcon class="h-5.5 w-5.5 text-primary" /> {{ t('torrent.addTag') }}
        </h3>
        <div class="form-control w-full mt-4">
          <label class="label font-bold text-xs uppercase opacity-75">{{ t('torrent.confirmAddTag') }}</label>
          <input
            v-model="addTagForm.name"
            type="text"
            class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10"
            :placeholder="t('torrent.tagPlaceholder')"
            @input="validateTagName"
          />
          <p v-if="addTagForm.error" class="text-[10px] text-error font-extrabold mt-1 animate-fadeIn">
            {{ addTagForm.error }}
          </p>
        </div>
        <!-- Actions -->
        <div class="modal-action gap-2 justify-end mt-6">
          <button @click="showAddTagModal = false" class="btn btn-ghost btn-sm rounded-xl">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmAddTag" :disabled="!addTagForm.name.trim() || !!addTagForm.error" class="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/25 font-bold">
            {{ t('torrent.confirm') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Edit Tracker Modal -->
    <EditTrackerModal
      :open="showEditTrackerModal"
      :torrent-ids="editTrackerTargetIds"
      @close="showEditTrackerModal = false"
      @saved="handleTrackerSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import CustomSelect from '@/components/CustomSelect.vue';
import SpeedChart from '@/components/SpeedChart.vue';
import FilterSidebar from '@/components/FilterSidebar.vue';
import TorrentCard from '@/components/TorrentCard.vue';
import TorrentFileTree from '@/components/TorrentFileTree.vue';
import EditTrackerModal from '@/components/EditTrackerModal.vue';
import { parseTorrentFile, buildFileTree, parseMagnetLink, type ParsedTorrent, type FileTreeNode } from '@/utils/torrentParser';
import type { UnifiedTorrent, TorrentProperties } from '@/models/torrent';
import { matchTorrentStatus } from '@/utils/torrentStatus';
import {
  AlertTriangleIcon,
  PauseIcon,
  PlayIcon,
  InboxIcon,
  SortAscIcon,
  SortDescIcon,
  Trash2Icon,
  PlusIcon,
  PlusCircleIcon,
  XIcon,
  UploadIcon,
  FileIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  InfoIcon,
  ZapIcon,
  Edit2Icon,
  FolderOpenIcon,
  TagIcon,
  ChevronRightIcon,
  GlobeIcon,
  CopyIcon,
} from 'lucide-vue-next';

const torrentStore = useTorrentStore();
const appStore = useAppStore();
const { t } = useI18n();

const selectedDetailTorrent = ref<UnifiedTorrent | null>(null);
const detailProperties = ref<TorrentProperties | null>(null);
let detailsPollIntervalId: any = null;

watch(selectedDetailTorrent, (newVal) => {
  if (detailsPollIntervalId) {
    clearInterval(detailsPollIntervalId);
    detailsPollIntervalId = null;
  }
  detailProperties.value = null;

  if (newVal) {
    const fetchProps = async () => {
      try {
        const propsData = await torrentStore.getTorrentProperties(newVal.id);
        detailProperties.value = propsData;
      } catch (err) {
        console.error('Failed to poll torrent properties:', err);
      }
    };
    fetchProps();
    detailsPollIntervalId = setInterval(fetchProps, 2000);
  }
});

onUnmounted(() => {
  if (detailsPollIntervalId) {
    clearInterval(detailsPollIntervalId);
    detailsPollIntervalId = null;
  }
});

const addForm = reactive({
  urls: '',
  savepath: '',
  category: '',
  paused: false,
  skip_checking: false,
  autoTMM: false,
  sequentialDownload: false,
  firstLastAsStream: false,
  addToTopOfQueue: false,
  rename: '',
  tags: '',
  contentLayout: 'Original',
  stopCondition: 'None',
  dlLimit: '',
  upLimit: '',
  ratioLimit: '',
  seedingTimeLimit: '',
  inactiveSeedingTimeLimit: '',
  forced: false,
  downloadPath: '',
  useDownloadPath: false,
});

const showAdvancedOptions = ref(false);

const sortOptions = computed(() => [
  { value: 'added_on', label: t('dashboard.sort.added_on') },
  { value: 'name', label: t('dashboard.sort.name') },
  { value: 'size', label: t('dashboard.sort.size') },
  { value: 'progress', label: t('dashboard.sort.progress') },
  { value: 'downloadSpeed', label: t('dashboard.sort.downloadSpeed') },
  { value: 'uploadSpeed', label: t('dashboard.sort.uploadSpeed') },
  { value: 'ratio', label: t('dashboard.sort.ratio') },
  { value: 'eta', label: t('dashboard.sort.eta') },
]);

const addCategoryOptions = computed(() => [
  { value: '', label: t('dashboard.noCategory') },
  ...appStore.categoryConfigs.map((c) => ({ value: c.name, label: c.name })),
]);

const contentLayoutOptions = computed(() => [
  { value: 'Original', label: t('dashboard.layoutOriginal') },
  { value: 'Subfolder', label: t('dashboard.layoutSubfolder') },
  { value: 'NoSubfolder', label: t('dashboard.layoutNoSubfolder') },
]);

const stopConditionOptions = computed(() => [
  { value: 'None', label: t('dashboard.stopNone') },
  { value: 'MetadataReceived', label: t('dashboard.stopMetadata') },
  { value: 'FilesChecked', label: t('dashboard.stopChecked') },
]);

const categoryPathsOptions = computed(() => {
  const cat = appStore.categoryConfigs.find((c) => c.name === addForm.category);
  return cat ? cat.paths.map((p) => ({ value: p, label: p })) : [];
});

watch(() => addForm.category, (newCat) => {
  if (newCat) {
    const cat = appStore.categoryConfigs.find((c) => c.name === newCat);
    if (cat && cat.paths.length > 0) {
      addForm.savepath = cat.paths[0];
    } else {
      addForm.savepath = '';
    }
  } else {
    addForm.savepath = '';
  }
});

const showAddModal = ref(false);
const addType = ref<'url' | 'file'>('file');
const isSubmitting = ref(false);
const selectedFiles = ref<File[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

const parsedTorrents = ref<ParsedTorrent[]>([]);
const activePreviewIndex = ref(0);

const activeFileTree = computed<FileTreeNode[]>(() => {
  const pt = parsedTorrents.value[activePreviewIndex.value];
  if (!pt) return [];
  return buildFileTree(pt.files);
});

const torrentPreviewOptions = computed(() => {
  return parsedTorrents.value.map((pt, idx) => ({
    value: idx,
    label: pt.name,
  }));
});

async function parseAndAddFile(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const parsed = await parseTorrentFile(buffer);
    parsedTorrents.value.push(parsed);
  } catch (err) {
    console.error('Failed to parse torrent file:', file.name, err);
    parsedTorrents.value.push({
      name: file.name,
      files: [],
      totalSize: file.size,
    });
  }
}

function openAddModal() {
  addForm.urls = '';
  addForm.savepath = '';
  addForm.category = '';
  addForm.paused = false;
  addForm.skip_checking = false;
  addForm.autoTMM = false;
  addForm.sequentialDownload = false;
  addForm.firstLastAsStream = false;
  addForm.addToTopOfQueue = false;
  addForm.rename = '';
  addForm.tags = '';
  addForm.contentLayout = 'Original';
  addForm.stopCondition = 'None';
  addForm.dlLimit = '';
  addForm.upLimit = '';
  addForm.ratioLimit = '';
  addForm.seedingTimeLimit = '';
  addForm.inactiveSeedingTimeLimit = '';
  addForm.forced = false;
  addForm.downloadPath = '';
  addForm.useDownloadPath = false;

  selectedFiles.value = [];
  parsedTorrents.value = [];
  activePreviewIndex.value = 0;
  addType.value = 'file';
  showAddModal.value = true;
  showAdvancedOptions.value = false;
}

function closeAddModal() {
  showAddModal.value = false;
}

function clearAddQueue() {
  selectedFiles.value = [];
  parsedTorrents.value = [];
  addForm.urls = '';
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i];
      selectedFiles.value.push(file);
      parseAndAddFile(file);
    }
  }
}

function handleFileDrop(e: DragEvent) {
  if (e.dataTransfer?.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i];
      if (file.name.endsWith('.torrent')) {
        selectedFiles.value.push(file);
        parseAndAddFile(file);
      }
    }
  }
}

function removeSelectedFile(index: number) {
  selectedFiles.value.splice(index, 1);
  parsedTorrents.value.splice(index, 1);
  if (activePreviewIndex.value >= parsedTorrents.value.length) {
    activePreviewIndex.value = Math.max(0, parsedTorrents.value.length - 1);
  }
}

const showDuplicateModal = ref(false);
const duplicateItems = ref<any[]>([]);
const allPendingItems = ref<any[]>([]);

const duplicateNamesString = computed(() => {
  return duplicateItems.value.map(i => i.name).join(', ');
});

async function mergeTrackersForDuplicates(duplicates: any[]) {
  for (const item of duplicates) {
    if (item.trackers && item.trackers.length > 0) {
      const trackersToMerge = item.trackers.map((url: string, idx: number) => ({ url, tier: idx }));
      await torrentStore.saveTorrentTrackers([item.infoHash.toLowerCase()], trackersToMerge, 'append');
    }
  }
}

async function executeAdd(items: any[]) {
  const files = items.map(i => i.file).filter(Boolean) as File[];
  const urls = items.map(i => i.url).filter(Boolean) as string[];

  if (files.length === 0 && urls.length === 0) return true;

  const success = await torrentStore.addTorrents({
    urls: urls.length > 0 ? urls.join('\n') : undefined,
    files: files.length > 0 ? files : undefined,
    savepath: addForm.savepath || undefined,
    category: addForm.category || undefined,
    paused: addForm.paused,
    skip_checking: addForm.skip_checking,
    autoTMM: addForm.autoTMM,
    sequentialDownload: addForm.sequentialDownload,
    firstLastAsStream: addForm.firstLastAsStream,
    addToTopOfQueue: addForm.addToTopOfQueue,
    tags: addForm.tags.trim() || undefined,
    rename: addForm.rename.trim() || undefined,
    upLimit: addForm.upLimit ? parseInt(addForm.upLimit, 10) * 1024 : undefined,
    dlLimit: addForm.dlLimit ? parseInt(addForm.dlLimit, 10) * 1024 : undefined,
    ratioLimit: addForm.ratioLimit ? parseFloat(addForm.ratioLimit) : undefined,
    seedingTimeLimit: addForm.seedingTimeLimit ? parseInt(addForm.seedingTimeLimit, 10) : undefined,
    inactiveSeedingTimeLimit: addForm.inactiveSeedingTimeLimit ? parseInt(addForm.inactiveSeedingTimeLimit, 10) : undefined,
    stopCondition: addForm.stopCondition !== 'None' ? addForm.stopCondition as any : undefined,
    contentLayout: addForm.contentLayout !== 'Original' ? addForm.contentLayout as any : undefined,
    forced: addForm.forced,
    downloadPath: addForm.useDownloadPath && addForm.downloadPath ? addForm.downloadPath : undefined,
    useDownloadPath: addForm.useDownloadPath,
  });

  if (!success) {
    alert(t('dashboard.failedToAdd'));
  }
  return success;
}

async function confirmAddWithMerge() {
  showDuplicateModal.value = false;
  isSubmitting.value = true;
  let success = false;
  try {
    await mergeTrackersForDuplicates(duplicateItems.value);
    
    // Add the non-duplicates
    const currentHashes = new Set(torrentStore.torrents.map(t => t.id.toLowerCase()));
    const nonDuplicates = allPendingItems.value.filter(t => !t.infoHash || !currentHashes.has(t.infoHash.toLowerCase()));
    if (nonDuplicates.length > 0) {
      success = await executeAdd(nonDuplicates);
    } else {
      success = true;
    }
    if (appStore.autoDeleteMode === 2 || (appStore.autoDeleteMode === 1 && success)) {
      clearAddQueue();
    }
    closeAddModal();
  } catch (err) {
    console.error(err);
    alert(t('dashboard.errorAdding'));
    if (appStore.autoDeleteMode === 2) {
      clearAddQueue();
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmAddWithNoMerge() {
  showDuplicateModal.value = false;
  isSubmitting.value = true;
  let success = false;
  try {
    success = await executeAdd(allPendingItems.value);
    if (appStore.autoDeleteMode === 2 || (appStore.autoDeleteMode === 1 && success)) {
      clearAddQueue();
    }
    closeAddModal();
  } catch (err) {
    console.error(err);
    alert(t('dashboard.errorAdding'));
    if (appStore.autoDeleteMode === 2) {
      clearAddQueue();
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function submitAdd() {
  isSubmitting.value = true;
  try {
    const torrentsToAdd: any[] = [];

    if (addType.value === 'file') {
      parsedTorrents.value.forEach((pt, idx) => {
        torrentsToAdd.push({
          name: pt.name,
          infoHash: pt.infoHash || '',
          trackers: pt.trackers || [],
          file: selectedFiles.value[idx],
        });
      });
    } else if (addType.value === 'url') {
      const lines = addForm.urls.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        if (line.startsWith('magnet:')) {
          const parsed = parseMagnetLink(line);
          if (parsed) {
            torrentsToAdd.push({
              name: parsed.name,
              infoHash: parsed.infoHash,
              trackers: parsed.trackers || [],
              url: line,
            });
          }
        } else {
          torrentsToAdd.push({
            name: line,
            infoHash: '',
            trackers: [],
            url: line,
          });
        }
      });
    }

    const currentHashes = new Set(torrentStore.torrents.map(t => t.id.toLowerCase()));
    const duplicates = torrentsToAdd.filter(t => t.infoHash && currentHashes.has(t.infoHash.toLowerCase()));

    let success = false;
    if (duplicates.length > 0) {
      if (appStore.askBeforeMergeTrackers) {
        duplicateItems.value = duplicates;
        allPendingItems.value = torrentsToAdd;
        closeAddModal();
        showDuplicateModal.value = true;
        isSubmitting.value = false;
        return;
      } else if (appStore.mergeDuplicateTrackers) {
        await mergeTrackersForDuplicates(duplicates);
        const nonDuplicates = torrentsToAdd.filter(t => !t.infoHash || !currentHashes.has(t.infoHash.toLowerCase()));
        if (nonDuplicates.length > 0) {
          success = await executeAdd(nonDuplicates);
        } else {
          success = true;
        }
      }
    } else {
      success = await executeAdd(torrentsToAdd);
    }

    if (appStore.autoDeleteMode === 2 || (appStore.autoDeleteMode === 1 && success)) {
      clearAddQueue();
    }
    closeAddModal();
  } catch (err) {
    console.error(err);
    alert(t('dashboard.errorAdding'));
    if (appStore.autoDeleteMode === 2) {
      clearAddQueue();
    }
  } finally {
    isSubmitting.value = false;
  }
}

// UI Filters states
const activeStatus = ref('all');
const activeCategory = ref('');
const activeTracker = ref('');
const activeTag = ref('');
const activeSavePath = ref('');
const deleteTargetName = ref('');



// Sorting config
const sortBy = ref<'name' | 'size' | 'progress' | 'downloadSpeed' | 'uploadSpeed' | 'ratio' | 'eta' | 'added_on'>('added_on');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Multi-select management
const selectedIds = ref<string[]>([]);

// Deletion modal state management
const showDeleteModal = ref(false);
const idsToDelete = ref<string[]>([]);
const deleteFilesFromDisk = ref(false);

// Auto-boot loop on mount
onMounted(() => {
  torrentStore.bootClient().then(() => {
    torrentStore.triggerSyncLoop();
  }).catch((e) => {
    console.warn('Dashboard boot sync connection not ready:', e);
  });
});

// Clear selections if filter matches change to avoid orphan ids
watch([activeStatus, activeCategory, activeTracker, activeTag, activeSavePath, () => torrentStore.searchQuery], () => {
  selectedIds.value = [];
});

// Reset page to 1 when filters or search change
watch(
  [activeStatus, activeCategory, activeTracker, activeTag, activeSavePath, () => torrentStore.searchQuery],
  () => {
    currentPage.value = 1;
  }
);

// Filter & Sort core telemetry list
const filteredTorrents = computed(() => {
  let list = [...torrentStore.torrents];

  // 1. Status Filter
  if (activeStatus.value !== 'all') {
    list = list.filter((t) => matchTorrentStatus(t, activeStatus.value));
  }

  // 2. Category Filter
  if (activeCategory.value !== '') {
    list = list.filter((t) => t.category === activeCategory.value);
  }

  // 3. Tracker Filter
  if (activeTracker.value !== '') {
    if (activeTracker.value === '__none__') {
      list = list.filter((t) => !extractTrackerDomain(t.tracker));
    } else {
      list = list.filter((t) => extractTrackerDomain(t.tracker) === activeTracker.value);
    }
  }

  // 3b. Tag Filter
  if (activeTag.value !== '') {
    list = list.filter((t) => t.tags && t.tags.includes(activeTag.value));
  }

  // 3c. Save Path Filter
  if (activeSavePath.value !== '') {
    list = list.filter((t) => t.savepath === activeSavePath.value);
  }

  // 4. Text query search filter using torrentStore (name only)
  const query = torrentStore.searchQuery.trim().toLowerCase();
  if (query) {
    list = list.filter((t) => t.name.toLowerCase().includes(query));
  }

  // 5. Sort calculations
  list.sort((a, b) => {
    const field = sortBy.value;
    const valA = a[field];
    const valB = b[field];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder.value === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder.value === 'asc' ? valA - valB : valB - valA;
    }

    return 0;
  });

  return list;
});

// Master Select & Pagination states
const currentPage = ref(1);
const pageSize = ref(20);
const jumpPageInput = ref(1);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredTorrents.value.length / pageSize.value));
});

watch(currentPage, (val) => {
  jumpPageInput.value = val;
});

watch(totalPages, (newVal) => {
  if (currentPage.value > newVal) {
    currentPage.value = newVal;
  }
});

function jumpToPage() {
  let val = Math.floor(jumpPageInput.value);
  if (isNaN(val) || val < 1) {
    val = 1;
  } else if (val > totalPages.value) {
    val = totalPages.value;
  }
  currentPage.value = val;
}

const paginatedTorrents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredTorrents.value.slice(start, end);
});

const isAllSelected = computed(() => {
  const currentList = filteredTorrents.value;
  if (currentList.length === 0) return false;
  return currentList.every((t) => selectedIds.value.includes(t.id));
});

const isSemiSelected = computed(() => {
  const currentList = filteredTorrents.value;
  if (currentList.length === 0) return false;
  const selectedCount = currentList.filter((t) => selectedIds.value.includes(t.id)).length;
  return selectedCount > 0 && selectedCount < currentList.length;
});

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  const currentList = filteredTorrents.value;
  if (checked) {
    const newIds = new Set([...selectedIds.value, ...currentList.map((t) => t.id)]);
    selectedIds.value = Array.from(newIds);
  } else {
    const currentSet = new Set(currentList.map((t) => t.id));
    selectedIds.value = selectedIds.value.filter((id) => !currentSet.has(id));
  }
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function extractTrackerDomain(tracker: string | undefined): string {
  if (!tracker) return '';
  try {
    return new URL(tracker).hostname.replace(/^www\./, '');
  } catch {
    const match = tracker.match(/^(?:https?:\/\/)?(?:www\.)?([^/:]+)/i);
    return match ? match[1] : tracker;
  }
}

function clearFilters() {
  activeStatus.value = 'all';
  activeCategory.value = '';
  activeTracker.value = '';
  activeTag.value = '';
  activeSavePath.value = '';
  torrentStore.searchQuery = '';
}

// Multi Select Logic
function toggleSelect(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((val) => val !== id);
  } else {
    selectedIds.value.push(id);
  }
}

function clearSelection() {
  selectedIds.value = [];
}

async function pauseSelected() {
  await torrentStore.pauseTorrents(selectedIds.value);
  clearSelection();
}

async function resumeSelected() {
  await torrentStore.resumeTorrents(selectedIds.value);
  clearSelection();
}

// Global actions wrappers
async function pauseAll() {
  await torrentStore.pauseAll();
}

async function resumeAll() {
  await torrentStore.resumeAll();
}

// Deletion Modals actions triggers
function openDeleteModal(ids: string[]) {
  idsToDelete.value = ids;
  deleteFilesFromDisk.value = false;
  if (ids.length === 1) {
    const t = torrentStore.torrents.find((x) => x.id === ids[0]);
    deleteTargetName.value = t ? t.name : '';
  } else {
    deleteTargetName.value = '';
  }
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  idsToDelete.value = [];
}

async function confirmDelete() {
  const success = await torrentStore.deleteTorrents(idsToDelete.value, deleteFilesFromDisk.value);
  if (success) {
    // Deduct selections
    selectedIds.value = selectedIds.value.filter((id) => !idsToDelete.value.includes(id));
  }
  closeDeleteModal();
}

// Format space bytes human readable
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0 || !isFinite(bytes) || isNaN(bytes)) return t('common.unknown');
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  if (bytesPerSec < 0 || !isFinite(bytesPerSec) || isNaN(bytesPerSec)) return t('common.unknown');
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp || timestamp <= 0) return '—';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 ' + t('common.second');
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}${t('common.day')}`);
  if (h > 0 || d > 0) parts.push(`${h}${t('common.hour')}`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}${t('common.minute')}`);
  if (parts.length === 0 || s > 0) parts.push(`${s}${t('common.second')}`);
  return parts.slice(0, 3).join(' ');
}

function formatLimit(limit: number): string {
  if (limit === undefined || limit <= 0) return t('common.unlimited');
  return formatSpeed(limit);
}

function formatPrivate(isPrivate: boolean | undefined): string {
  if (isPrivate === undefined) return t('common.unknown');
  return isPrivate ? t('torrent.privateDetail') : t('torrent.publicDetail');
}

function formatPieces(num: number | undefined, size: number | undefined): string {
  if (num === undefined || size === undefined) return '未知';
  return `${num} x ${formatSize(size)} (已完成: ${num})`;
}

// Context menu operations and dialogs
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
});
const contextMenuTorrent = ref<UnifiedTorrent | null>(null);

function openContextMenu(e: MouseEvent, torrent: UnifiedTorrent) {
  let x = e.clientX;
  let y = e.clientY;
  
  // Viewport safety boundary check
  const menuWidth = 224;
  const menuHeight = 260;
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8;
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 8;
  }

  contextMenu.show = true;
  contextMenu.x = x;
  contextMenu.y = y;
  contextMenuTorrent.value = torrent;

  const close = () => {
    contextMenu.show = false;
    document.removeEventListener('click', close);
    document.removeEventListener('contextmenu', close);
  };
  
  setTimeout(() => {
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
  }, 50);
}

// Dialog Modal States & Forms
const showRenameModal = ref(false);
const renameForm = reactive({
  id: '',
  name: '',
});

const showChangePathModal = ref(false);
const changePathForm = reactive({
  ids: [] as string[],
  path: '',
});

const showAddTagModal = ref(false);
const addTagForm = reactive({
  name: '',
  error: '',
});

const showEditTrackerModal = ref(false);
const editTrackerTargetIds = ref<string[]>([]);

const allTags = computed(() => torrentStore.tags);

function isTagSelected(tag: string): boolean {
  if (!contextMenuTorrent.value || !contextMenuTorrent.value.tags) return false;
  return contextMenuTorrent.value.tags.includes(tag);
}

async function toggleTorrentTag(tag: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (!contextMenuTorrent.value) return;
  if (checked) {
    await torrentStore.addTorrentTags([contextMenuTorrent.value.id], [tag]);
  } else {
    await torrentStore.removeTorrentTags([contextMenuTorrent.value.id], [tag]);
  }
}

function openRenameModal(torrent: UnifiedTorrent) {
  renameForm.id = torrent.id;
  renameForm.name = torrent.name.replace(/^\[Mock\]\s+/, '');
  showRenameModal.value = true;
}

async function confirmRename() {
  await torrentStore.renameTorrent(renameForm.id, renameForm.name);
  showRenameModal.value = false;
}

function openChangePathModal(torrent: UnifiedTorrent) {
  changePathForm.ids = [torrent.id];
  changePathForm.path = torrent.savepath || '';
  showChangePathModal.value = true;
}

async function confirmChangePath() {
  await torrentStore.setTorrentsLocation(changePathForm.ids, changePathForm.path);
  showChangePathModal.value = false;
}

function openAddTagModal() {
  addTagForm.name = '';
  addTagForm.error = '';
  showAddTagModal.value = true;
}

function validateTagName() {
  const name = addTagForm.name.trim();
  if (!name) {
    addTagForm.error = '';
    return;
  }
  if (allTags.value.includes(name)) {
    addTagForm.error = t('torrent.tagExists');
  } else {
    addTagForm.error = '';
  }
}

async function confirmAddTag() {
  const name = addTagForm.name.trim();
  if (name && !allTags.value.includes(name)) {
    await torrentStore.createTags([name]);
    if (contextMenuTorrent.value) {
      await torrentStore.addTorrentTags([contextMenuTorrent.value.id], [name]);
    }
    showAddTagModal.value = false;
  }
}

async function togglePlayTorrent(torrent: UnifiedTorrent) {
  if (torrent.status === 'paused') {
    await torrentStore.resumeTorrents([torrent.id]);
  } else {
    await torrentStore.pauseTorrents([torrent.id]);
  }
}

async function forceStartTorrent(torrent: UnifiedTorrent) {
  await torrentStore.forceStartTorrents([torrent.id]);
}

function deleteSingleTorrent(torrent: UnifiedTorrent) {
  openDeleteModal([torrent.id]);
}

async function removeAllTorrentTags(torrent: UnifiedTorrent) {
  if (torrent.tags && torrent.tags.length > 0) {
    await torrentStore.removeTorrentTags([torrent.id], torrent.tags);
  }
}

function openEditTrackerModal(torrent: UnifiedTorrent) {
  const targetIds = selectedIds.value.includes(torrent.id)
    ? [...selectedIds.value]
    : [torrent.id];
  editTrackerTargetIds.value = targetIds;
  showEditTrackerModal.value = true;
}

function handleTrackerSaved(payload: { success: boolean }) {
  if (payload.success) {
    alert(t('torrent.saveSuccess'));
  }
}

async function handleContextAction(action: string) {
  const torrent = contextMenuTorrent.value;
  if (!torrent) return;

  contextMenu.show = false;

  switch (action) {
    case 'toggle-play':
      await togglePlayTorrent(torrent);
      break;
    case 'force-start':
      await forceStartTorrent(torrent);
      break;
    case 'rename':
      openRenameModal(torrent);
      break;
    case 'change-path':
      openChangePathModal(torrent);
      break;
    case 'edit-tracker':
      openEditTrackerModal(torrent);
      break;
    case 'add-tag':
      openAddTagModal();
      break;
    case 'remove-all-tags':
      await removeAllTorrentTags(torrent);
      break;
    case 'delete':
      deleteSingleTorrent(torrent);
      break;
  }
}
</script>

<style scoped>
@keyframes slideRight {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.animate-slideRight {
  animation: slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
