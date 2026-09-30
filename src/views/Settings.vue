<template>
  <div class="max-w-[1400px] mx-auto flex flex-col gap-6 p-4 sm:p-6 text-base-content h-full">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-base-content/10 pb-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight">{{ t('settings.configSettings') }}</h1>
        <p class="text-xs opacity-60 mt-1">{{ t('settings.configDesc') }}</p>
      </div>
      <a href="#/" class="btn btn-neutral btn-sm rounded-xl">
        <ArrowLeftIcon class="h-4 w-4 mr-1" /> {{ t('common.back') }}
      </a>
    </div>

    <!-- Connection Offline Warning Banner -->
    <div 
      v-if="!torrentStore.isConnected" 
      @click="selectTab('connection')"
      class="bg-warning/10 border border-warning/30 shadow-md rounded-2xl p-4 flex flex-row items-center justify-between gap-4 text-xs font-semibold cursor-pointer hover:bg-warning/20 transition-all duration-200 animate-fadeIn"
    >
      <div class="flex items-center gap-3">
        <AlertTriangleIcon class="h-5 w-5 text-warning shrink-0 animate-pulse" />
        <div class="leading-snug text-left">
          <span class="font-black text-amber-800 dark:text-warning block mb-0.5 text-sm">{{ t('settings.notConnectedWarningTitle') }}</span>
          <span class="font-normal text-xs text-base-content/80 block mt-0.5">{{ t('settings.notConnectedWarningDesc') }}</span>
        </div>
      </div>
      <button class="btn btn-warning btn-sm rounded-xl px-4 shadow-lg shadow-warning/25 font-bold shrink-0">
        {{ t('settings.goToConnectionSettings') }}
      </button>
    </div>

    <!-- Mobile Tab Selector (Visible on Mobile only) -->
    <div class="flex md:hidden items-center justify-between p-3.5 bg-base-100 border border-base-content/10 rounded-2xl shadow-sm animate-fadeIn">
      <button
        type="button"
        @click="showMobileMenu = true"
        class="btn btn-neutral btn-sm rounded-xl flex items-center gap-1.5 font-bold"
      >
        <MenuIcon class="h-4 w-4" /> {{ t('settings.menuTitle') }}
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xs opacity-60 font-semibold">{{ t('settings.activeTab') }}</span>
        <span class="badge badge-primary font-bold text-xs px-2.5 py-1 h-auto rounded-lg">{{ getTabLabel(activeTab) }}</span>
      </div>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
      <!-- Left Navigation Menu (Desktop persistent sidebar, Mobile drawer overlay) -->
      <aside
        class="md:col-span-1 transition-all duration-300 md:flex flex-col gap-2 bg-base-100/50 p-3 rounded-2xl border border-base-content/10"
        :class="showMobileMenu ? 'fixed inset-0 z-[100] p-4 bg-black/60 backdrop-blur-sm flex justify-start' : 'hidden md:flex'"
        @click.self="showMobileMenu = false"
      >
        <div
          class="w-72 max-w-[85%] md:w-full md:max-w-none h-full md:h-auto bg-base-200 md:bg-transparent p-4 md:p-0 rounded-2xl border border-base-content/10 md:border-none flex flex-col gap-2 shadow-2xl md:shadow-none"
          :class="showMobileMenu ? 'animate-slideRight' : ''"
        >
          <!-- Mobile Drawer Header -->
          <div class="flex items-center justify-between md:hidden border-b border-base-content/10 pb-3 mb-2">
            <span class="font-black text-sm tracking-tight text-base-content">{{ t('settings.menuTitle') }}</span>
            <button @click="showMobileMenu = false" class="btn btn-ghost btn-xs btn-circle text-base-content/70">
              <XIcon class="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            @click="selectTab('general')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'general' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <PaletteIcon class="h-4 w-4" /> {{ t('settings.tabGeneral') }}
          </button>
          <button
            type="button"
            @click="selectTab('download')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'download' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <DownloadIcon class="h-4 w-4" /> {{ t('settings.tabDownload') }}
          </button>
          <button
            type="button"
            @click="selectTab('speed')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'speed' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <GaugeIcon class="h-4 w-4" /> {{ t('settings.tabSpeed') }}
          </button>
          <button
            type="button"
            @click="selectTab('connection')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'connection' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <RadioIcon class="h-4 w-4" /> {{ t('settings.tabConnection') }}
          </button>
          <button
            type="button"
            @click="selectTab('bittorrent')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'bittorrent' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <TagIcon class="h-4 w-4" /> {{ t('settings.tabBitTorrent') }}
          </button>
          <button
            v-if="isDev"
            type="button"
            @click="selectTab('simulation')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'simulation' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <CpuIcon class="h-4 w-4" /> {{ t('settings.tabSimulation') }}
          </button>
        </div>
      </aside>

      <!-- Right Content Panels -->
      <main class="md:col-span-4 flex flex-col gap-6">
        <!-- 1. General Panel (Language first, Theme second) -->
        <div v-if="activeTab === 'general'" class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn">
          <!-- UI Language Switcher -->
          <div class="relative z-20 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base-content/10">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <LanguagesIcon class="h-5 w-5 text-primary" /> {{ t('settings.languageTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.languageDesc') }}</span>
            </div>

            <div class="relative w-full sm:max-w-xs shrink-0">
              <CustomSelect 
                v-model="appStore.locale" 
                :options="[
                  { value: 'zh', label: '简体中文 (Chinese)' },
                  { value: 'en', label: 'English' }
                ]"
                @change="(val) => appStore.setLocale(val)"
              />
            </div>
          </div>

          <!-- UI Theme Selector -->
          <div class="relative z-10 text-left flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-base-content/10">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <PaletteIcon class="h-5 w-5 text-secondary" /> {{ t('settings.uiThemes') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.themeDesc') }}</span>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              <!-- Custom Styled Theme Dropdown (No Double Arrows) -->
              <div class="relative w-full sm:w-44" ref="dropdownContainer">
                <button 
                  type="button"
                  @click="toggleThemeDropdown"
                  class="w-full bg-base-200 hover:bg-base-300/80 active:bg-base-300 border border-base-content/15 rounded-xl focus:outline-none flex items-center justify-between font-bold capitalize text-sm h-11 px-4 text-base-content text-left animate-fadeIn"
                  :class="isDropdownOpen ? 'border-primary/50 ring-1 ring-primary/20 bg-base-300' : ''"
                >
                  <span class="truncate">{{ appStore.theme }}</span>
                  <ChevronDownIcon class="h-4 w-4 opacity-50 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isDropdownOpen }" />
                </button>

                <div 
                  v-if="isDropdownOpen" 
                  ref="dropdownMenu"
                  class="absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 bg-base-200 border border-base-content/15 rounded-xl shadow-2xl max-h-64 overflow-y-auto w-full"
                  style="--tw-bg-opacity: 1 !important; background-color: var(--b2) !important; background-color: hsl(var(--b2)) !important; background-color: oklch(var(--b2)) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; opacity: 1 !important;"
                >
                  <div class="flex flex-col gap-0.5">
                    <button
                      v-for="t in availableThemes"
                      :key="t.name"
                      type="button"
                      @click="selectThemeOption(t.name)"
                      class="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-base-content/10 transition-colors capitalize text-xs font-semibold text-left"
                      :class="appStore.theme === t.name ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'border border-transparent'"
                    >
                      <span class="truncate">{{ t.name }}</span>
                      <div class="flex items-center gap-1 shrink-0">
                        <span class="h-3 w-3 rounded-full border border-base-content/10" :style="{ backgroundColor: t.primary }"></span>
                        <span class="h-3 w-3 rounded-full border border-base-content/10" :style="{ backgroundColor: t.secondary }"></span>
                        <span class="h-3 w-3 rounded-full border border-base-content/10" :style="{ backgroundColor: t.accent }"></span>
                        <span class="h-3 w-3 rounded-full border border-base-content/10" :style="{ backgroundColor: t.neutral }"></span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Swatch of current active theme -->
              <div class="flex items-center gap-3 bg-base-200/50 px-4 py-2.5 rounded-xl border border-base-content/10 select-none w-full sm:w-auto justify-center">
                <span class="text-xs font-semibold opacity-60">{{ t('settings.activeSwatch') }}</span>
                <div class="flex items-center gap-2">
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="h-3.5 w-3.5 rounded-full border border-base-content/10 shadow-sm" :style="{ backgroundColor: currentThemeColors.primary }"></span>
                    <span class="text-[8px] opacity-50 font-mono">Pri</span>
                  </div>
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="h-3.5 w-3.5 rounded-full border border-base-content/10 shadow-sm" :style="{ backgroundColor: currentThemeColors.secondary }"></span>
                    <span class="text-[8px] opacity-50 font-mono">Sec</span>
                  </div>
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="h-3.5 w-3.5 rounded-full border border-base-content/10 shadow-sm" :style="{ backgroundColor: currentThemeColors.accent }"></span>
                    <span class="text-[8px] opacity-50 font-mono">Acc</span>
                  </div>
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="h-3.5 w-3.5 rounded-full border border-base-content/10 shadow-sm" :style="{ backgroundColor: currentThemeColors.neutral }"></span>
                    <span class="text-[8px] opacity-50 font-mono">Neu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar Customization -->
          <div class="relative z-0 text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <SlidersIcon class="h-5 w-5 text-accent" /> {{ t('settings.sidebarCustomization') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.sidebarCustomizationDesc') }}</span>
            </div>

            <div class="border border-base-content/10 rounded-xl overflow-hidden divide-y divide-base-content/10 bg-base-200 w-full">
                <div 
                  v-for="(secId, index) in sectionsOrder" 
                  :key="secId" 
                  class="flex items-center justify-between p-3 text-sm"
                >
                  <div class="flex items-center gap-3 font-semibold">
                    <component :is="getSectionIcon(secId)" class="h-4 w-4 opacity-75 shrink-0" />
                    <span class="font-bold text-xs" :class="{ 'opacity-50': !isSectionVisible(secId) }">
                      {{ getSectionLabel(secId) }}
                    </span>
                    <span v-if="secId === 'status'" class="badge badge-sm badge-ghost text-[9px] scale-95 opacity-60 px-1.5 py-0.5 h-auto rounded select-none">
                      {{ t('settings.alwaysVisible') }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1">
                    <button 
                      type="button" 
                      @click="moveSection(index, 'up')" 
                      :disabled="index === 0"
                      class="btn btn-ghost btn-xs btn-circle hover:bg-base-content/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      :title="t('settings.moveUp')"
                    >
                      <ChevronUpIcon class="h-4 w-4" />
                    </button>
                    <button 
                      type="button" 
                      @click="moveSection(index, 'down')" 
                      :disabled="index === sectionsOrder.length - 1"
                      class="btn btn-ghost btn-xs btn-circle hover:bg-base-content/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      :title="t('settings.moveDown')"
                    >
                      <ChevronDownIcon class="h-4 w-4" />
                    </button>
                    
                    <div class="h-4 w-px bg-base-content/10 mx-1 font-normal opacity-50"></div>

                    <button 
                      type="button" 
                      @click="toggleSectionVisibility(secId)" 
                      :disabled="secId === 'status'"
                      class="btn btn-ghost btn-xs px-2 h-7 rounded-lg hover:bg-base-content/10 text-xs font-bold disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1"
                      :class="isSectionVisible(secId) ? 'text-success' : 'text-base-content/40'"
                    >
                      <component :is="isSectionVisible(secId) ? EyeIcon : EyeOffIcon" class="h-3.5 w-3.5" />
                      <span>{{ isSectionVisible(secId) ? t('settings.showSection') : t('settings.hideSection') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- 2. Download Panel -->
        <div v-if="activeTab === 'download'" class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 animate-fadeIn flex flex-col gap-6">
          <!-- When adding torrent settings -->
          <div class="relative text-left flex flex-col gap-3 pb-6 border-b border-base-content/10">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <DownloadIcon class="h-5 w-5 text-primary" /> {{ t('settings.whenAddingTorrent') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.whenAddingTorrentDesc') }}</span>
            </div>

            <div class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5">
              <!-- Add to top of queue -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="appStore.addToTopOfQueue"
                  @change="(e: any) => appStore.setAddToTopOfQueue(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.addToTopOfQueue') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.addToTopOfQueueDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Do not start download automatically -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="appStore.doNotStart"
                  @change="(e: any) => appStore.setDoNotStart(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.doNotStart') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.doNotStartDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Skip hash check -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="appStore.skipChecking"
                  @change="(e: any) => appStore.setSkipChecking(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('dashboard.skipChecking') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('dashboard.skipChecking') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Auto Delete Mode -->
              <div class="form-control w-full">
                <label class="label font-bold text-[10px] uppercase opacity-60 py-1">{{ t('dashboard.autoDeleteMode') }}</label>
                <CustomSelect 
                  :modelValue="appStore.autoDeleteMode" 
                  @update:modelValue="(val: any) => appStore.setAutoDeleteMode(val)"
                  :options="autoDeleteModeOptions" 
                />
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Automatic Torrent Management (TMM) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="appStore.autoTMM"
                  @change="(e: any) => appStore.setAutoTMM(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('dashboard.autoTMM') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('dashboard.autoTMMDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Force Start -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="appStore.forced"
                  @change="(e: any) => appStore.setForced(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('dashboard.forced') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('dashboard.forcedDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Use Temp Download Path -->
              <div class="flex flex-col gap-3">
                <label class="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    :checked="appStore.useDownloadPath"
                    @change="(e: any) => appStore.setUseDownloadPath(e.target.checked)"
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                  />
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-bold text-base-content">{{ t('dashboard.downloadPath') }}</span>
                    <span class="text-[10px] opacity-50">{{ t('dashboard.downloadPathPlaceholder') }}</span>
                  </div>
                </label>
                
                <input
                  v-if="appStore.useDownloadPath"
                  :value="appStore.downloadPath"
                  @input="(e: any) => appStore.setDownloadPath(e.target.value)"
                  type="text"
                  :placeholder="t('dashboard.downloadPathPlaceholder')"
                  class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-10 min-h-[40px] px-3 border border-base-content/10 animate-fadeIn"
                />
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Dropdowns: Content Layout & Stop Condition -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="form-control w-full">
                  <label class="label font-bold text-[10px] uppercase opacity-60 py-1">{{ t('dashboard.contentLayout') }}</label>
                  <CustomSelect 
                    :modelValue="appStore.contentLayout" 
                    @update:modelValue="(val: any) => appStore.setContentLayout(val)"
                    :options="contentLayoutOptions" 
                  />
                </div>

                <div class="form-control w-full">
                  <label class="label font-bold text-[10px] uppercase opacity-60 py-1">{{ t('dashboard.stopCondition') }}</label>
                  <CustomSelect 
                    :modelValue="appStore.stopCondition" 
                    @update:modelValue="(val: any) => appStore.setStopCondition(val)"
                    :options="stopConditionOptions" 
                  />
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Sub-header: When adding duplicate torrents -->
              <div class="flex flex-col gap-1 mt-1">
                <span class="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <CopyIcon class="h-4 w-4" /> {{ t('settings.whenAddingDuplicate') }}
                </span>
                <span class="text-[10px] opacity-50">{{ t('settings.whenAddingDuplicateDesc') }}</span>
              </div>

              <!-- Merge duplicate trackers -->
              <label class="flex items-start gap-3 cursor-pointer select-none pl-2">
                <input
                  :checked="appStore.mergeDuplicateTrackers"
                  @change="(e: any) => appStore.setMergeDuplicateTrackers(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-secondary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.mergeDuplicateTrackers') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.mergeDuplicateTrackersDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-0.5 pl-2 w-full"></div>

              <!-- Ask before merge trackers -->
              <label class="flex items-start gap-3 cursor-pointer select-none pl-2">
                <input
                  :checked="appStore.askBeforeMergeTrackers"
                  @change="(e: any) => appStore.setAskBeforeMergeTrackers(e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-secondary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.askBeforeMergeTrackers') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.askBeforeMergeTrackersDesc') }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Category & Save Paths section -->
          <div class="relative text-left flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <h2 class="text-base font-bold flex items-center gap-2">
                  <FolderIcon class="h-5 w-5 text-secondary" /> {{ t('settings.categoryPaths') }}
                </h2>
                <span class="text-xs opacity-60">{{ t('settings.categoryPathsDesc') }}</span>
              </div>
              <button 
                type="button" 
                @click="openCreateCategoryModal" 
                class="btn btn-primary btn-sm btn-circle h-8 w-8 min-h-[32px] rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center" 
                :title="t('settings.createCategory')"
              >
                <PlusIcon class="h-4 w-4" />
              </button>
            </div>

            <!-- List of Categories with their paths -->
            <div v-if="appStore.categoryConfigs.length > 0" class="flex flex-col gap-4 mt-1">
              <div
                v-for="cat in appStore.categoryConfigs"
                :key="cat.name"
                class="flex flex-col gap-3 p-4 bg-base-200/30 rounded-2xl border border-base-content/10"
              >
                <!-- Category Header -->
                <div class="flex items-center justify-between border-b border-base-content/5 pb-2">
                  <div class="flex items-center gap-2">
                    <FolderOpenIcon class="h-5 w-5 text-secondary animate-pulse" />
                    <span class="font-black text-sm tracking-wide">{{ cat.name }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button 
                      type="button" 
                      @click="openAddPathModal(cat.name)" 
                      class="btn btn-ghost btn-xs btn-circle text-secondary hover:bg-secondary/15 h-6 w-6" 
                      :title="t('settings.addPathBtn')"
                    >
                      <PlusIcon class="h-3.5 w-3.5" />
                    </button>
                    <button 
                      type="button" 
                      @click="torrentStore.removeCategory(cat.name)" 
                      class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/15 h-6 w-6" 
                      :title="t('settings.removeCategory')"
                    >
                      <TrashIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Paths list for this category -->
                <div class="flex flex-col gap-1.5 mt-0.5">
                  <div v-if="cat.paths.length > 0" class="flex flex-col gap-1.5">
                    <div
                      v-for="path in cat.paths"
                      :key="path"
                      class="flex items-center justify-between px-3 py-2 bg-base-300/40 rounded-lg border border-base-content/5 text-[11px] font-mono"
                    >
                      <span class="truncate pr-4">{{ path }}</span>
                      <button type="button" @click="appStore.removePathFromCategory(cat.name, path)" class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10 h-5 w-5 min-h-[20px]">
                        <XIcon class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div v-else class="text-[11px] opacity-40 text-center py-2 bg-base-200/10 rounded-xl border border-dashed border-base-content/5">
                    {{ t('settings.noPaths') }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs opacity-40 text-center py-8 bg-base-200/20 rounded-2xl border border-dashed border-base-content/10">
              {{ t('settings.noCategories') }}
            </div>
          </div>

          <div class="h-px bg-base-content/10 w-full"></div>

          <!-- Disk & Extension Settings (Server Settings) -->
          <div class="relative text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <HardDriveIcon class="h-5 w-5 text-accent animate-pulse" /> {{ t('settings.diskAndExtensionTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.diskAndExtensionDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5 relative">
              <!-- Loading overlay when updating preferences -->
              <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                <div class="flex items-center gap-2 text-xs font-bold">
                  <span class="loading loading-spinner loading-xs text-primary"></span>
                  <span>{{ t('settings.updatingPreferences') }}</span>
                </div>
              </div>

              <!-- Disk Preallocation (preallocate_all) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.preallocate_all"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('preallocate_all', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.preallocateAll') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.preallocateAllDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Append .!qB to Incomplete Files (incomplete_files_ext) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.incomplete_files_ext"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('incomplete_files_ext', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.incompleteFilesExt') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.incompleteFilesExtDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Use Unwanted Folder (use_unwanted_folder) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.use_unwanted_folder"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('use_unwanted_folder', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.useUnwantedFolder') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.useUnwantedFolderDesc') }}</span>
                </div>
              </label>
            </div>
          </div>

          <div class="h-px bg-base-content/10 w-full"></div>

          <!-- Save Path & TMM Settings (Server Settings) -->
          <div class="relative text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <FolderIcon class="h-5 w-5 text-secondary" /> {{ t('settings.savePathAndTmmTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.savePathAndTmmDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5 relative">
              <!-- Loading overlay when updating preferences -->
              <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                <div class="flex items-center gap-2 text-xs font-bold">
                  <span class="loading loading-spinner loading-xs text-primary"></span>
                  <span>{{ t('settings.updatingPreferences') }}</span>
                </div>
              </div>

              <!-- Default Torrent Management Mode (auto_tmm_enabled) -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.autoTmmEnabled') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.autoTmmEnabledDesc') }}</span>
                </div>
                <div class="w-full sm:max-w-[200px] shrink-0">
                  <CustomSelect 
                    :modelValue="prefs.auto_tmm_enabled ? 'Automatic' : 'Manual'" 
                    @update:modelValue="(val: any) => updatePref('auto_tmm_enabled', val === 'Automatic')"
                    :options="[
                      { value: 'Automatic', label: t('settings.tmmModeAutomatic') },
                      { value: 'Manual', label: t('settings.tmmModeManual') }
                    ]"
                    :disabled="savingPrefs"
                  />
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- TMM Interaction: Torrent category/save path changes (torrent_changed_tmm_enabled) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.torrent_changed_tmm_enabled"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('torrent_changed_tmm_enabled', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.torrentChangedTmmEnabled') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.torrentChangedTmmEnabledDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- TMM Interaction: Default save path changes (save_path_changed_tmm_enabled) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.save_path_changed_tmm_enabled"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('save_path_changed_tmm_enabled', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.savePathChangedTmmEnabled') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.savePathChangedTmmEnabledDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- TMM Interaction: Category path changes (category_changed_tmm_enabled) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.category_changed_tmm_enabled"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('category_changed_tmm_enabled', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.categoryChangedTmmEnabled') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.categoryChangedTmmEnabledDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Keep category paths in manual mode (use_category_paths_in_manual_mode) -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.use_category_paths_in_manual_mode"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('use_category_paths_in_manual_mode', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.useCategoryPathsInManualMode') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.useCategoryPathsInManualModeDesc') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- export_dir (Save copy of torrent to) -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1 flex flex-col items-start gap-0.5">
                  <span>{{ t('settings.exportDir') }}</span>
                  <span class="text-[9px] font-normal opacity-50 lowercase text-left">{{ t('settings.exportDirDesc') }}</span>
                </label>
                <input
                  :value="prefs.export_dir"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('export_dir', e.target.value)"
                  type="text"
                  :placeholder="t('settings.exportDirPlaceholder')"
                  class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-xs h-10 px-3 border border-base-content/10"
                />
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- export_dir_fin (Save completed torrent to) -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1 flex flex-col items-start gap-0.5">
                  <span>{{ t('settings.exportDirFin') }}</span>
                  <span class="text-[9px] font-normal opacity-50 lowercase text-left">{{ t('settings.exportDirFinDesc') }}</span>
                </label>
                <input
                  :value="prefs.export_dir_fin"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('export_dir_fin', e.target.value)"
                  type="text"
                  :placeholder="t('settings.exportDirFinPlaceholder')"
                  class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-xs h-10 px-3 border border-base-content/10"
                />
              </div>
            </div>
          </div>

          <div class="h-px bg-base-content/10 w-full"></div>

          <!-- Monitored Folders Settings (Server Settings) -->
          <div class="relative text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <FolderOpenIcon class="h-5 w-5 text-accent" /> {{ t('settings.monitoredFoldersTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.monitoredFoldersDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5 relative">
              <!-- Loading overlay when updating preferences -->
              <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                <div class="flex items-center gap-2 text-xs font-bold">
                  <span class="loading loading-spinner loading-xs text-primary"></span>
                  <span>{{ t('settings.updatingPreferences') }}</span>
                </div>
              </div>

              <!-- Enable Monitored Folders Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.download_in_scan_dirs"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('download_in_scan_dirs', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableMonitoredFolders') }}</span>
                </div>
              </label>

              <!-- Conditionally display watched folders details -->
              <div v-if="prefs.download_in_scan_dirs" class="flex flex-col gap-4 mt-2 animate-fadeIn">
                
                <!-- Add monitored folder inline form -->
                <div class="bg-base-300/40 p-3 rounded-xl border border-base-content/5 flex flex-col gap-3">
                  <span class="text-xs font-bold text-base-content/90">{{ t('settings.addWatchFolder') }}</span>
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <!-- Watch Path Input -->
                    <div class="form-control md:col-span-5 w-full">
                      <label class="label text-[10px] font-bold opacity-60 py-0.5">{{ t('settings.watchPath') }}</label>
                      <input
                        v-model="newWatchPath"
                        type="text"
                        :placeholder="t('settings.watchPathPlaceholder')"
                        class="input input-bordered w-full rounded-lg bg-base-200 focus:outline-none focus:border-accent text-xs h-9 px-3 border border-base-content/10"
                      />
                    </div>

                    <!-- Save Location dropdown -->
                    <div class="form-control md:col-span-3 w-full">
                      <label class="label text-[10px] font-bold opacity-60 py-0.5">{{ t('settings.saveLocation') }}</label>
                      <CustomSelect 
                        v-model="newSaveLocationType" 
                        :options="[
                          { value: 'default', label: t('settings.saveLocationDefault') },
                          { value: 'monitored', label: t('settings.saveLocationMonitored') },
                          { value: 'custom', label: t('settings.saveLocationCustom') }
                        ]"
                      />
                    </div>

                    <!-- Custom Save Path input -->
                    <div v-if="newSaveLocationType === 'custom'" class="form-control md:col-span-3 w-full animate-fadeIn">
                      <label class="label text-[10px] font-bold opacity-60 py-0.5">{{ t('settings.saveLocationCustom') }}</label>
                      <input
                        v-model="newCustomSavePath"
                        type="text"
                        :placeholder="t('settings.customPathPlaceholder')"
                        class="input input-bordered w-full rounded-lg bg-base-200 focus:outline-none focus:border-accent text-xs h-9 px-3 border border-base-content/10"
                      />
                    </div>

                    <!-- Add button -->
                    <div class="form-control md:col-span-1" :class="newSaveLocationType !== 'custom' ? 'md:col-span-4' : ''">
                      <button
                        type="button"
                        @click="addWatchFolder"
                        :disabled="!newWatchPath.trim() || (newSaveLocationType === 'custom' && !newCustomSavePath.trim())"
                        class="btn btn-accent btn-sm rounded-lg w-full text-xs font-bold h-9"
                      >
                        {{ t('common.add') }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Watch folders list table -->
                <div class="overflow-x-auto border border-base-content/10 rounded-xl bg-base-300/10">
                  <table class="table table-sm w-full text-xs text-left">
                    <thead>
                      <tr class="bg-base-300/40 text-base-content/70">
                        <th class="py-2 px-3">{{ t('settings.watchPath') }}</th>
                        <th class="py-2 px-3">{{ t('settings.saveLocation') }}</th>
                        <th class="py-2 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr 
                        v-for="(dest, path) in prefs.scan_dirs" 
                        :key="path"
                        class="hover:bg-base-200/40 border-b border-base-content/5"
                      >
                        <td class="py-2.5 px-3 font-mono break-all text-xs text-base-content/95">{{ path }}</td>
                        <td class="py-2.5 px-3">
                          <span v-if="dest === 0 || dest === '0'" class="badge badge-outline badge-neutral text-[10px] rounded-lg">
                            {{ t('settings.saveLocationDefault') }}
                          </span>
                          <span v-else-if="dest === 1 || dest === '1'" class="badge badge-outline badge-accent text-[10px] rounded-lg">
                            {{ t('settings.saveLocationMonitored') }}
                          </span>
                          <span v-else class="font-mono text-[10px] bg-base-200 px-2 py-0.5 rounded border border-base-content/5 text-secondary truncate max-w-[200px] inline-block align-middle">
                            {{ dest }}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          <button 
                            type="button" 
                            @click="removeWatchFolder(String(path))" 
                            class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/15 h-6 w-6"
                          >
                            <TrashIcon class="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!prefs.scan_dirs || Object.keys(prefs.scan_dirs).length === 0">
                        <td colspan="3" class="py-4 text-center text-xs opacity-50 font-medium italic">
                          {{ t('settings.noWatchFolders') }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Speed & Scheduler Panel -->
        <div v-if="activeTab === 'speed'" class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn">
          <!-- Global & Alternative Speed Limits -->
          <div class="relative text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <GaugeIcon class="h-5 w-5 text-primary" /> {{ t('settings.speedSettingsTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.speedSettingsDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5 relative">
              <!-- Loading overlay when updating preferences -->
              <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                <div class="flex items-center gap-2 text-xs font-bold">
                  <span class="loading loading-spinner loading-xs text-primary"></span>
                  <span>{{ t('settings.updatingPreferences') }}</span>
                </div>
              </div>

              <!-- Speed Note -->
              <span class="text-[10px] opacity-60 bg-base-300/40 p-2.5 rounded-lg border border-base-content/5">{{ t('settings.speedUnitNote') }}</span>

              <!-- Global Upload Speed -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1">
                  <span>{{ t('settings.upLimitLabel') }}</span>
                </label>
                <div class="flex items-center gap-2 w-full">
                  <div class="relative flex items-center w-full">
                    <input
                      :value="upLimitDisplay"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => upLimitDisplay = Math.max(0, parseInt(e.target.value || '0'))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="incrementSpeed('up_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="decrementSpeed('up_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div class="w-24 shrink-0">
                    <CustomSelect
                      v-model="upLimitUnit"
                      :options="[
                        { value: 'KiB', label: 'KB/s' },
                        { value: 'MiB', label: 'MB/s' }
                      ]"
                      :disabled="savingPrefs"
                      buttonClass="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Global Download Speed -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1">
                  <span>{{ t('settings.dlLimitLabel') }}</span>
                </label>
                <div class="flex items-center gap-2 w-full">
                  <div class="relative flex items-center w-full">
                    <input
                      :value="dlLimitDisplay"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => dlLimitDisplay = Math.max(0, parseInt(e.target.value || '0'))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="incrementSpeed('dl_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="decrementSpeed('dl_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div class="w-24 shrink-0">
                    <CustomSelect
                      v-model="dlLimitUnit"
                      :options="[
                        { value: 'KiB', label: 'KB/s' },
                        { value: 'MiB', label: 'MB/s' }
                      ]"
                      :disabled="savingPrefs"
                      buttonClass="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-2 w-full border-t border-base-content/10"></div>

              <!-- Alternative Upload Speed -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1">
                  <span>{{ t('settings.altUpLimitLabel') }}</span>
                </label>
                <div class="flex items-center gap-2 w-full">
                  <div class="relative flex items-center w-full">
                    <input
                      :value="altUpLimitDisplay"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => altUpLimitDisplay = Math.max(0, parseInt(e.target.value || '0'))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="incrementSpeed('alt_up_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="decrementSpeed('alt_up_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div class="w-24 shrink-0">
                    <CustomSelect
                      v-model="altUpLimitUnit"
                      :options="[
                        { value: 'KiB', label: 'KB/s' },
                        { value: 'MiB', label: 'MB/s' }
                      ]"
                      :disabled="savingPrefs"
                      buttonClass="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Alternative Download Speed -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1">
                  <span>{{ t('settings.altDlLimitLabel') }}</span>
                </label>
                <div class="flex items-center gap-2 w-full">
                  <div class="relative flex items-center w-full">
                    <input
                      :value="altDlLimitDisplay"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => altDlLimitDisplay = Math.max(0, parseInt(e.target.value || '0'))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="incrementSpeed('alt_dl_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="decrementSpeed('alt_dl_limit')"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div class="w-24 shrink-0">
                    <CustomSelect
                      v-model="altDlLimitUnit"
                      :options="[
                        { value: 'KiB', label: 'KB/s' },
                        { value: 'MiB', label: 'MB/s' }
                      ]"
                      :disabled="savingPrefs"
                      buttonClass="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="h-px bg-base-content/10 w-full"></div>

          <!-- Speed Limit Scheduler -->
          <div class="relative text-left flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <SlidersIcon class="h-5 w-5 text-secondary" /> {{ t('settings.schedulerTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.schedulerDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4 mt-2 bg-base-200/30 p-4 rounded-xl border border-base-content/5 relative">
              <!-- Loading overlay when updating preferences -->
              <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                <div class="flex items-center gap-2 text-xs font-bold">
                  <span class="loading loading-spinner loading-xs text-primary"></span>
                  <span>{{ t('settings.updatingPreferences') }}</span>
                </div>
              </div>

              <!-- Enable Scheduler Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.scheduler_enabled"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('scheduler_enabled', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableScheduler') }}</span>
                </div>
              </label>

              <!-- Conditionally show Scheduler options -->
              <div v-if="prefs.scheduler_enabled" class="flex flex-col gap-4 mt-2 animate-fadeIn">
                
                <!-- Scheduler Days -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.schedulerDaysLabel') }}</span>
                  <div class="w-full sm:max-w-xs shrink-0">
                    <CustomSelect 
                      :modelValue="prefs.scheduler_days" 
                      @update:modelValue="(val: any) => updatePref('scheduler_days', parseInt(val))"
                      :options="[
                        { value: 0, label: t('settings.schedulerDaysOptions.everyDay') },
                        { value: 1, label: t('settings.schedulerDaysOptions.weekdays') },
                        { value: 2, label: t('settings.schedulerDaysOptions.weekends') },
                        { value: 3, label: t('settings.schedulerDaysOptions.monday') },
                        { value: 4, label: t('settings.schedulerDaysOptions.tuesday') },
                        { value: 5, label: t('settings.schedulerDaysOptions.wednesday') },
                        { value: 6, label: t('settings.schedulerDaysOptions.thursday') },
                        { value: 7, label: t('settings.schedulerDaysOptions.friday') },
                        { value: 8, label: t('settings.schedulerDaysOptions.saturday') },
                        { value: 9, label: t('settings.schedulerDaysOptions.sunday') }
                      ]"
                      :disabled="savingPrefs"
                    />
                  </div>
                </div>

                <div class="h-px bg-base-content/5 my-1 w-full"></div>

                <!-- Time Range selects -->
                <div class="flex flex-col gap-3">
                  <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.schedulerTimeLabel') }}</span>
                  <div class="flex flex-col sm:flex-row gap-4 items-center bg-base-300/20 p-3 rounded-xl border border-base-content/5">
                    
                    <!-- Start Hour / Min -->
                    <div class="flex items-center gap-2">
                      <span class="text-xs opacity-75">{{ t('settings.schedulerTimeFrom') }}:</span>
                      <div class="flex items-center gap-1">
                        <select
                          :value="prefs.schedule_from_hour"
                          :disabled="savingPrefs"
                          @change="(e: any) => updatePref('schedule_from_hour', parseInt(e.target.value))"
                          class="select select-bordered select-xs rounded-lg bg-base-200 font-mono focus:outline-none"
                        >
                          <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2, '0') }}</option>
                        </select>
                        <span class="font-bold">:</span>
                        <select
                          :value="prefs.schedule_from_min"
                          :disabled="savingPrefs"
                          @change="(e: any) => updatePref('schedule_from_min', parseInt(e.target.value))"
                          class="select select-bordered select-xs rounded-lg bg-base-200 font-mono focus:outline-none"
                        >
                          <option v-for="m in 60" :key="m-1" :value="m-1">{{ String(m-1).padStart(2, '0') }}</option>
                        </select>
                      </div>
                    </div>

                    <span class="hidden sm:inline text-xs opacity-50">➜</span>

                    <!-- End Hour / Min -->
                    <div class="flex items-center gap-2">
                      <span class="text-xs opacity-75">{{ t('settings.schedulerTimeTo') }}:</span>
                      <div class="flex items-center gap-1">
                        <select
                          :value="prefs.schedule_to_hour"
                          :disabled="savingPrefs"
                          @change="(e: any) => updatePref('schedule_to_hour', parseInt(e.target.value))"
                          class="select select-bordered select-xs rounded-lg bg-base-200 font-mono focus:outline-none"
                        >
                          <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2, '0') }}</option>
                        </select>
                        <span class="font-bold">:</span>
                        <select
                          :value="prefs.schedule_to_min"
                          :disabled="savingPrefs"
                          @change="(e: any) => updatePref('schedule_to_min', parseInt(e.target.value))"
                          class="select select-bordered select-xs rounded-lg bg-base-200 font-mono focus:outline-none"
                        >
                          <option v-for="m in 60" :key="m-1" :value="m-1">{{ String(m-1).padStart(2, '0') }}</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- 3. Connection Panel -->
        <div v-if="activeTab === 'connection'" class="flex flex-col gap-6">
          <!-- Local Connection Settings Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn">
            <!-- Connection Parameters -->
            <div class="text-left flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h2 class="text-base font-bold flex items-center gap-2">
                  <RadioIcon class="h-5 w-5 text-primary" /> {{ t('settings.connParams') }}
                </h2>
              </div>

              <div class="flex flex-col gap-4">
                <!-- Downloader Driver Type -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.clientType') }}</span>
                  <div class="w-full sm:max-w-xs shrink-0">
                    <CustomSelect v-model="form.driverType" :options="driverOptions" />
                  </div>
                </div>

                <!-- Endpoint URL -->
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75 justify-between">
                    <span>{{ t('settings.webUiUrl') }}</span>
                    <span class="text-[10px] lowercase text-primary font-normal">{{ t('settings.autoDetect') }}</span>
                  </label>
                  <input
                    v-model="form.url"
                    type="text"
                    placeholder="e.g. http://192.168.1.100:8080 or leave blank"
                    class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary font-mono text-sm h-11 px-4 border border-base-content/10"
                  />
                  <p class="text-[10px] opacity-50 mt-1">
                    {{ t('settings.urlTip') }}
                  </p>
                </div>

                <!-- Credentials -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.username') }}</label>
                    <input
                      v-model="form.username"
                      type="text"
                      placeholder="admin"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-11 px-4 border border-base-content/10"
                    />
                  </div>

                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.password') }}</label>
                    <input
                      v-model="form.password"
                      type="password"
                      placeholder="••••••••"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-11 px-4 border border-base-content/10"
                    />
                  </div>
                </div>

                <!-- Action Triggers -->
                <div class="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-base-content/10">
                  <div class="flex items-center gap-2">
                    <!-- Test Connection status badge -->
                    <span v-if="testStatus === 'success'" class="badge badge-success font-semibold gap-1.5 py-3.5 px-3.5 rounded-xl">
                      <CheckCircle2Icon class="h-4 w-4" /> {{ t('settings.connSuccess') }}
                    </span>
                    <span v-else-if="testStatus === 'error'" class="badge badge-error font-semibold gap-1.5 py-3.5 px-3.5 rounded-xl">
                      <XCircleIcon class="h-4 w-4" /> {{ t('settings.connFailed') }}
                    </span>
                    <span v-else-if="testStatus === 'testing'" class="loading loading-ring loading-md text-primary"></span>
                  </div>

                  <div class="flex gap-2">
                    <button @click="testConnection" :disabled="testStatus === 'testing'" class="btn btn-neutral btn-sm rounded-xl font-bold">
                      {{ t('settings.testConn') }}
                    </button>
                    <button @click="saveSettings" :disabled="testStatus === 'testing'" class="btn btn-primary btn-sm rounded-xl font-bold shadow-lg shadow-primary/20">
                      {{ t('common.save') }}
                    </button>
                  </div>
                </div>

                <!-- Connection error logs details -->
                <div v-if="testStatus === 'error' && errorLog" class="p-3 bg-error/10 border border-error/20 rounded-xl text-xs font-mono text-error break-all">
                  {{ errorLog }}
                </div>

                <!-- Warnings / Tips Inside Connection Parameters -->
                <div class="h-px bg-base-content/10 my-2"></div>
                
                <div class="flex flex-col gap-3">
                  <!-- Standard WebUI Alert -->
                  <div class="bg-primary/5 border border-primary/20 p-4 rounded-xl flex flex-col gap-1.5 text-xs text-left">
                    <h4 class="font-extrabold flex items-center gap-1.5 text-primary uppercase tracking-wider">
                      <LayersIcon class="h-4 w-4" /> {{ t('settings.webuiModeTitle') }}
                    </h4>
                    <p class="leading-relaxed opacity-80">
                      {{ t('settings.webuiModeDesc') }}
                    </p>
                  </div>

                  <!-- CORS Tips -->
                  <div class="bg-warning/5 border border-warning/20 p-4 rounded-xl flex flex-col gap-1.5 text-xs text-left">
                    <h4 class="font-extrabold flex items-center gap-1.5 text-warning uppercase tracking-wider">
                      <ShieldAlertIcon class="h-4 w-4" /> {{ t('settings.corsTitle') }}
                    </h4>
                    <p class="leading-relaxed opacity-80 font-semibold">
                      {{ t('settings.corsDesc') }}
                    </p>
                  </div>

                  <!-- SameSite Cookie Info -->
                  <div class="bg-info/5 border border-info/20 p-4 rounded-xl flex flex-col gap-1.5 text-xs text-left">
                    <h4 class="font-extrabold flex items-center gap-1.5 text-info uppercase tracking-wider">
                      <CookieIcon class="h-4 w-4" /> {{ t('settings.samesiteTitle') }}
                    </h4>
                    <p class="leading-relaxed opacity-80">
                      {{ t('settings.samesiteDesc') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="h-px bg-base-content/10 w-full"></div>

            <!-- Change Downloader WebUI Credentials -->
            <div class="text-left flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h2 class="text-base font-bold flex items-center gap-2">
                  <KeyRoundIcon class="h-5 w-5 text-secondary animate-pulse" /> {{ t('settings.changeCredentialsTitle') }}
                </h2>
                <p class="text-xs opacity-60 leading-relaxed">
                  {{ t('settings.changeCredentialsDesc') }}
                </p>
              </div>

              <form @submit.prevent="handleChangeCredentials" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <!-- New Username -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.newUsername') }}</label>
                    <input
                      v-model="changeCredForm.username"
                      type="text"
                      required
                      placeholder="admin"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-sm h-11 px-4 border border-base-content/10"
                    />
                  </div>

                  <!-- New Password -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.newPassword') }}</label>
                    <input
                      v-model="changeCredForm.password"
                      type="password"
                      required
                      placeholder="••••••••"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-sm h-11 px-4 border border-base-content/10"
                    />
                  </div>

                  <!-- Confirm Password -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.confirmPassword') }}</label>
                    <input
                      v-model="changeCredForm.confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-sm h-11 px-4 border border-base-content/10"
                    />
                  </div>
                </div>

                <!-- Action buttons & messages -->
                <div class="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-base-content/10">
                  <div class="flex items-center gap-2">
                    <span v-if="changeCredStatus === 'success'" class="badge badge-success font-semibold gap-1.5 py-3.5 px-3.5 rounded-xl animate-fadeIn">
                      <CheckCircle2Icon class="h-4 w-4" /> {{ t('settings.credentialsChanged') }}
                    </span>
                    <span v-else-if="changeCredStatus === 'error'" class="badge badge-error font-semibold gap-1.5 py-3.5 px-3.5 rounded-xl animate-fadeIn">
                      <XCircleIcon class="h-4 w-4" /> {{ changeCredError || t('settings.credentialsChangeFailed') }}
                    </span>
                    <span v-else-if="changeCredStatus === 'loading'" class="loading loading-ring loading-md text-secondary"></span>
                  </div>

                  <button 
                    type="submit" 
                    :disabled="changeCredStatus === 'loading'" 
                    class="btn btn-secondary btn-sm rounded-xl font-bold shadow-lg shadow-secondary/20 ml-auto"
                  >
                    {{ t('settings.btnChange') }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Downloader Server Connection Performance Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn text-left relative">
            <!-- Loading overlay when updating preferences -->
            <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span class="loading loading-spinner loading-xs text-primary"></span>
                <span>{{ t('settings.updatingPreferences') }}</span>
              </div>
            </div>

            <!-- Header -->
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <GlobeIcon class="h-5 w-5 text-primary" /> {{ t('settings.serverConnTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.serverConnDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4">
              <!-- BitTorrent Protocol Selection -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.bittorrentProtocolLabel') }}</span>
                <div class="w-full sm:max-w-xs shrink-0">
                  <CustomSelect
                    :modelValue="prefs.bittorrent_protocol"
                    @update:modelValue="(val: any) => updatePref('bittorrent_protocol', parseInt(val))"
                    :options="[
                      { value: 0, label: t('settings.bittorrentProtocolOptions.all') },
                      { value: 1, label: t('settings.bittorrentProtocolOptions.tcp') },
                      { value: 2, label: t('settings.bittorrentProtocolOptions.utp') }
                    ]"
                    :disabled="savingPrefs"
                  />
                </div>
              </div>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Listening Port -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75 py-1">
                  <span>{{ t('settings.listenPortLabel') }}</span>
                </label>
                <div class="flex items-center gap-2 w-full">
                  <div class="relative flex items-center w-full">
                    <input
                      :value="prefs.listen_port"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('listen_port', Math.max(1, Math.min(65535, parseInt(e.target.value || '1'))))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="updatePref('listen_port', Math.min(65535, prefs.listen_port + 1))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="updatePref('listen_port', Math.max(1, prefs.listen_port - 1))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="randomizePort"
                    :disabled="savingPrefs"
                    class="btn btn-neutral h-10 min-h-0 rounded-xl px-4 text-xs font-bold font-mono"
                  >
                    {{ t('settings.randomPortBtn') }}
                  </button>
                </div>
              </div>

              <!-- UPnP Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none mt-2">
                <input
                  :checked="prefs.upnp"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('upnp', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableUpnp') }}</span>
                </div>
              </label>

              <!-- Connection Limits Section -->
              <div class="h-px bg-base-content/10 my-3 w-full"></div>

              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-bold flex items-center gap-2">
                  <SlidersIcon class="h-4.5 w-4.5 text-secondary" /> {{ t('settings.connLimitsTitle') }}
                </h3>
              </div>

              <!-- Limits inputs grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Max connection -->
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75 py-1">
                    <span>{{ t('settings.maxConnecLabel') }}</span>
                  </label>
                  <div class="relative flex items-center w-full">
                    <input
                      :value="prefs.max_connec"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('max_connec', Math.max(0, parseInt(e.target.value || '0')))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="updatePref('max_connec', prefs.max_connec + 10)"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="updatePref('max_connec', Math.max(0, prefs.max_connec - 10))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Max connection per torrent -->
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75 py-1">
                    <span>{{ t('settings.maxConnecPerTorrentLabel') }}</span>
                  </label>
                  <div class="relative flex items-center w-full">
                    <input
                      :value="prefs.max_connec_per_torrent"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('max_connec_per_torrent', Math.max(0, parseInt(e.target.value || '0')))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="updatePref('max_connec_per_torrent', prefs.max_connec_per_torrent + 5)"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="updatePref('max_connec_per_torrent', Math.max(0, prefs.max_connec_per_torrent - 5))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Max uploads -->
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75 py-1">
                    <span>{{ t('settings.maxUploadsLabel') }}</span>
                  </label>
                  <div class="relative flex items-center w-full">
                    <input
                      :value="prefs.max_uploads"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('max_uploads', Math.max(0, parseInt(e.target.value || '0')))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="updatePref('max_uploads', prefs.max_uploads + 5)"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="updatePref('max_uploads', Math.max(0, prefs.max_uploads - 5))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Max uploads per torrent -->
                <div class="form-control w-full">
                  <label class="label font-bold text-xs uppercase opacity-75 py-1">
                    <span>{{ t('settings.maxUploadsPerTorrentLabel') }}</span>
                  </label>
                  <div class="relative flex items-center w-full">
                    <input
                      :value="prefs.max_uploads_per_torrent"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('max_uploads_per_torrent', Math.max(0, parseInt(e.target.value || '0')))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                    />
                    <!-- Custom up/down adjustment buttons -->
                    <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                      <button
                        type="button"
                        @click="updatePref('max_uploads_per_torrent', prefs.max_uploads_per_torrent + 2)"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronUpIcon class="h-3 w-3 shrink-0" />
                      </button>
                      <button
                        type="button"
                        @click="updatePref('max_uploads_per_torrent', Math.max(0, prefs.max_uploads_per_torrent - 2))"
                        :disabled="savingPrefs"
                        class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                      >
                        <ChevronDownIcon class="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Proxy Settings Section -->
              <div class="h-px bg-base-content/10 my-3 w-full"></div>

              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-bold flex items-center gap-2">
                  <InboxIcon class="h-4.5 w-4.5 text-primary" /> {{ t('settings.proxySettingsTitle') }}
                </h3>
              </div>

              <!-- Proxy Type -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.proxyTypeLabel') }}</span>
                <div class="w-full sm:max-w-xs shrink-0">
                  <CustomSelect
                    :modelValue="prefs.proxy_type"
                    @update:modelValue="(val: any) => updatePref('proxy_type', parseInt(val))"
                    :options="[
                      { value: -1, label: t('settings.proxyTypeOptions.none') },
                      { value: 1, label: t('settings.proxyTypeOptions.httpNoAuth') },
                      { value: 3, label: t('settings.proxyTypeOptions.httpAuth') },
                      { value: 2, label: t('settings.proxyTypeOptions.socks5NoAuth') },
                      { value: 4, label: t('settings.proxyTypeOptions.socks5Auth') },
                      { value: 5, label: t('settings.proxyTypeOptions.socks4NoAuth') }
                    ]"
                    :disabled="savingPrefs"
                  />
                </div>
              </div>

              <!-- Conditional proxy configuration fields -->
              <div v-if="prefs.proxy_type !== -1" class="flex flex-col gap-4 bg-base-200/35 p-4 rounded-xl border border-base-content/5 mt-2 animate-fadeIn">
                <!-- Host & Port -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <!-- Host -->
                  <div class="form-control w-full sm:col-span-2">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.proxyIpLabel') }}</span>
                    </label>
                    <input
                      :value="prefs.proxy_ip"
                      @change="(e: any) => updatePref('proxy_ip', e.target.value.trim())"
                      type="text"
                      placeholder="e.g. proxy.example.com or 12.34.56.78"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 px-3 border border-base-content/10"
                    />
                  </div>

                  <!-- Port -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.proxyPortLabel') }}</span>
                    </label>
                    <input
                      :value="prefs.proxy_port"
                      @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                      @change="(e: any) => updatePref('proxy_port', Math.max(1, Math.min(65535, parseInt(e.target.value || '8080'))))"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 px-3 border border-base-content/10"
                    />
                  </div>
                </div>

                <!-- Toggle for peer connections -->
                <label class="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    :checked="prefs.proxy_peer_connections"
                    :disabled="savingPrefs"
                    @change="(e: any) => updatePref('proxy_peer_connections', e.target.checked)"
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                  />
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-bold text-base-content">{{ t('settings.proxyPeerConnectionsLabel') }}</span>
                  </div>
                </label>

                <!-- Conditional authentication fields -->
                <div v-if="prefs.proxy_type === 3 || prefs.proxy_type === 4" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 border-t border-base-content/5 pt-4 animate-fadeIn">
                  <!-- Username -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.proxyUsernameLabel') }}</span>
                    </label>
                    <input
                      :value="prefs.proxy_username"
                      @change="(e: any) => updatePref('proxy_username', e.target.value.trim())"
                      type="text"
                      placeholder="Username"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 px-3 border border-base-content/10"
                    />
                  </div>

                  <!-- Password -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.proxyPasswordLabel') }}</span>
                    </label>
                    <input
                      :value="prefs.proxy_password"
                      @change="(e: any) => updatePref('proxy_password', e.target.value)"
                      type="password"
                      placeholder="••••••••"
                      :disabled="savingPrefs"
                      class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 px-3 border border-base-content/10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. BitTorrent Panel -->
        <div v-if="activeTab === 'bittorrent'" class="flex flex-col gap-6">
          <!-- Privacy & Protocols Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn text-left relative">
            <!-- Loading overlay when updating preferences -->
            <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span class="loading loading-spinner loading-xs text-primary"></span>
                <span>{{ t('settings.updatingPreferences') }}</span>
              </div>
            </div>

            <!-- Header -->
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <TagIcon class="h-5 w-5 text-primary" /> {{ t('settings.privacyTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.privacyDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4">
              <!-- DHT Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.dht"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('dht', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableDht') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- PeX Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.pex"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('pex', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enablePex') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- LSD Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.lsd"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('lsd', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableLsd') }}</span>
                </div>
              </label>

              <div class="h-px bg-base-content/5 my-1 w-full"></div>

              <!-- Encryption Mode Selector -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span class="font-bold text-xs uppercase opacity-75">{{ t('settings.encryptionModeLabel') }}</span>
                <div class="w-full sm:max-w-xs shrink-0">
                  <CustomSelect
                    :modelValue="prefs.encryption"
                    @update:modelValue="(val: any) => updatePref('encryption', parseInt(val))"
                    :options="[
                      { value: 0, label: t('settings.encryptionModeOptions.prefer') },
                      { value: 1, label: t('settings.encryptionModeOptions.forceOn') },
                      { value: 2, label: t('settings.encryptionModeOptions.forceOff') }
                    ]"
                    :disabled="savingPrefs"
                  />
                </div>
              </div>

              <div class="h-px bg-base-content/10 my-2"></div>

              <!-- Anonymous Mode Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.anonymous_mode"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('anonymous_mode', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.anonymousModeLabel') }}</span>
                  <span class="text-[10px] opacity-50">{{ t('settings.anonymousModeDesc') }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Queueing Settings Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 flex flex-col gap-6 animate-fadeIn text-left relative">
            <!-- Loading overlay when updating preferences -->
            <div v-if="savingPrefs" class="absolute inset-0 bg-base-200/50 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span class="loading loading-spinner loading-xs text-primary"></span>
                <span>{{ t('settings.updatingPreferences') }}</span>
              </div>
            </div>

            <!-- Header -->
            <div class="flex flex-col gap-1">
              <h2 class="text-base font-bold flex items-center gap-2">
                <SlidersIcon class="h-5 w-5 text-secondary" /> {{ t('settings.queueingTitle') }}
              </h2>
              <span class="text-xs opacity-60">{{ t('settings.queueingDesc') }}</span>
            </div>

            <!-- Server offline warning if not simulation and disconnected -->
            <div 
              v-if="!torrentStore.isConnected && !appStore.simulationMode"
              class="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-warning"
            >
              <AlertTriangleIcon class="h-4 w-4 text-warning shrink-0" />
              <span>{{ t('settings.serverSettingsUnavailable') }}</span>
            </div>

            <div v-else class="flex flex-col gap-4">
              <!-- Enable Queueing Toggle -->
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  :checked="prefs.queueing_enabled"
                  :disabled="savingPrefs"
                  @change="(e: any) => updatePref('queueing_enabled', e.target.checked)"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-bold text-base-content">{{ t('settings.enableQueueing') }}</span>
                </div>
              </label>

              <!-- Conditionally render active queues limits -->
              <div v-if="prefs.queueing_enabled" class="flex flex-col gap-4 mt-2 animate-fadeIn border-t border-base-content/5 pt-4">
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <!-- Max active downloads -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.maxActiveDownloads') }}</span>
                    </label>
                    <div class="relative flex items-center w-full">
                      <input
                        :value="prefs.max_active_downloads"
                        @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                        @change="(e: any) => updatePref('max_active_downloads', Math.max(0, parseInt(e.target.value || '0')))"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        :disabled="savingPrefs"
                        class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                      />
                      <!-- Custom up/down adjustment buttons -->
                      <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                        <button
                          type="button"
                          @click="updatePref('max_active_downloads', prefs.max_active_downloads + 1)"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronUpIcon class="h-3 w-3 shrink-0" />
                        </button>
                        <button
                          type="button"
                          @click="updatePref('max_active_downloads', Math.max(0, prefs.max_active_downloads - 1))"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronDownIcon class="h-3 w-3 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Max active uploads -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.maxActiveUploads') }}</span>
                    </label>
                    <div class="relative flex items-center w-full">
                      <input
                        :value="prefs.max_active_uploads"
                        @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                        @change="(e: any) => updatePref('max_active_uploads', Math.max(0, parseInt(e.target.value || '0')))"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        :disabled="savingPrefs"
                        class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                      />
                      <!-- Custom up/down adjustment buttons -->
                      <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                        <button
                          type="button"
                          @click="updatePref('max_active_uploads', prefs.max_active_uploads + 1)"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronUpIcon class="h-3 w-3 shrink-0" />
                        </button>
                        <button
                          type="button"
                          @click="updatePref('max_active_uploads', Math.max(0, prefs.max_active_uploads - 1))"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronDownIcon class="h-3 w-3 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Max active torrents -->
                  <div class="form-control w-full">
                    <label class="label font-bold text-xs uppercase opacity-75 py-1">
                      <span>{{ t('settings.maxActiveTorrents') }}</span>
                    </label>
                    <div class="relative flex items-center w-full">
                      <input
                        :value="prefs.max_active_torrents"
                        @input="(e: any) => e.target.value = e.target.value.replace(/\D/g, '')"
                        @change="(e: any) => updatePref('max_active_torrents', Math.max(0, parseInt(e.target.value || '0')))"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        :disabled="savingPrefs"
                        class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 pl-3 pr-9 border border-base-content/10"
                      />
                      <!-- Custom up/down adjustment buttons -->
                      <div class="absolute right-2 flex flex-col gap-0.5 select-none">
                        <button
                          type="button"
                          @click="updatePref('max_active_torrents', prefs.max_active_torrents + 1)"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronUpIcon class="h-3 w-3 shrink-0" />
                        </button>
                        <button
                          type="button"
                          @click="updatePref('max_active_torrents', Math.max(0, prefs.max_active_torrents - 1))"
                          :disabled="savingPrefs"
                          class="h-3.5 w-4.5 flex items-center justify-center text-base-content/40 hover:text-primary transition-colors hover:bg-base-content/10 active:bg-base-content/20 rounded-sm"
                        >
                          <ChevronDownIcon class="h-3 w-3 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="h-px bg-base-content/5 my-1 w-full"></div>

                <!-- Dont count slow torrents toggle -->
                <label class="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    :checked="prefs.dont_count_slow_torrents"
                    :disabled="savingPrefs"
                    @change="(e: any) => updatePref('dont_count_slow_torrents', e.target.checked)"
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm rounded-lg mt-0.5"
                  />
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-bold text-base-content">{{ t('settings.dontCountSlow') }}</span>
                    <span class="text-[10px] opacity-50">{{ t('settings.dontCountSlowDesc') }}</span>
                  </div>
                </label>

              </div>
            </div>
          </div>
        </div>

        <!-- 5. Simulation Panel -->
        <div v-if="activeTab === 'simulation' && isDev" class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 text-left animate-fadeIn flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-bold flex items-center gap-2">
              <CpuIcon class="h-5 w-5 text-primary" /> {{ t('settings.simulationTitle') }}
            </h2>
            <p class="text-xs opacity-60 leading-relaxed">
              {{ t('settings.simulationDesc') }}
            </p>
          </div>

          <div class="flex flex-col gap-5">

            <!-- Enable Simulation Toggle -->
            <div class="form-control bg-base-200/50 border border-base-content/5 p-4 rounded-xl flex flex-row items-center justify-between gap-4">
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-bold">{{ t('settings.enableSimulation') }}</span>
                <span class="text-[10px] opacity-50">{{ t('settings.enableSimulationDesc') }}</span>
              </div>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                :checked="appStore.simulationMode"
                @change="toggleSimulationMode"
              />
            </div>

            <!-- Extra Simulation configs (e.g. simulatedCount slider/input) -->
            <div v-if="appStore.simulationMode" class="flex flex-col gap-4 animate-fadeIn">
              <!-- Mock Count -->
              <div class="form-control bg-base-200/30 border border-base-content/5 p-4 rounded-xl flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase opacity-75">{{ t('settings.simulatedTorrentsCount') }}</span>
                  <span class="text-sm font-mono font-black text-secondary">{{ appStore.simulatedCount }}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="40"
                  step="1"
                  :value="appStore.simulatedCount"
                  class="range range-secondary range-xs"
                  @input="handleSimulatedCountChange"
                />
                <div class="w-full flex justify-between text-[10px] px-1 font-mono opacity-50">
                  <span>4</span>
                  <span>12</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                </div>
              </div>

              <!-- Reset Data button -->
              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  @click="handleRegenerateSimData"
                  class="btn btn-neutral btn-sm rounded-xl font-bold flex items-center gap-1.5"
                >
                  <SparklesIcon class="h-4 w-4 text-warning" />
                  {{ t('settings.regenerateSimData') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Dialog Modals -->
    <!-- Create Category Modal -->
    <div v-if="showCreateCategoryModal" class="modal modal-open">
      <div class="modal-box bg-base-200 border border-base-content/10 rounded-2xl max-w-sm text-left">
        <h3 class="font-black text-base mb-3">{{ t('settings.createCategory') }}</h3>
        <input
          v-model="newCategoryInput"
          type="text"
          :placeholder="t('settings.categoryPlaceholder')"
          class="input input-bordered w-full rounded-xl bg-base-300 focus:outline-none focus:border-primary text-sm h-10 px-3 border border-base-content/10 mb-4"
          @keyup.enter="submitCreateCategory"
        />
        <div class="modal-action mt-0 gap-2">
          <button type="button" class="btn btn-neutral btn-sm rounded-xl font-bold" @click="showCreateCategoryModal = false">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-primary btn-sm rounded-xl font-bold" @click="submitCreateCategory">
            {{ t('common.create') }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop bg-black/40 backdrop-blur-xs" @click="showCreateCategoryModal = false"></div>
    </div>

    <!-- Add Path Modal -->
    <div v-if="showAddPathModal" class="modal modal-open">
      <div class="modal-box bg-base-200 border border-base-content/10 rounded-2xl max-w-md text-left overflow-visible">
        <h3 class="font-black text-base mb-1">{{ t('settings.addPathBtn') }}</h3>
        <p class="text-xs opacity-60 mb-4">{{ t('settings.targetCategory') }} <span class="font-bold text-secondary">{{ activeCategoryForPath }}</span></p>

        <!-- Mode 1: Torrent save paths exist -->
        <div v-if="torrentStore.torrentSavePaths.length > 0" class="flex flex-col gap-3">
          <!-- Dropdown Mode -->
          <div v-if="!isManualPathInput" class="flex flex-col gap-2">
            <label class="text-xs font-bold opacity-75 flex items-center justify-between">
              <span>{{ t('settings.selectPathFromTorrents') }}</span>
              <span class="text-[10px] font-normal opacity-50">{{ t('settings.availablePathsCount', { count: torrentStore.torrentSavePaths.length }) }}</span>
            </label>
            <CustomSelect 
              v-model="selectedPathOption" 
              :options="addPathSelectOptions" 
              @change="onPathOptionChange"
            />
            <div class="flex items-center justify-between text-xs mt-1">
              <span class="opacity-60">{{ t('settings.notWhatYouWant') }}</span>
              <button 
                type="button" 
                @click="switchToManual" 
                class="text-secondary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {{ t('settings.enterManually') }}
              </button>
            </div>
          </div>

          <!-- Manual Input Mode -->
          <div v-else class="flex flex-col gap-2 animate-fadeIn">
            <label class="text-xs font-bold opacity-75">{{ t('settings.manualPathInputLabel') }}</label>
            <input
              ref="customInputRef"
              v-model="manualPathInput"
              type="text"
              :placeholder="t('settings.addPathPlaceholder')"
              class="input input-bordered w-full rounded-xl bg-base-300 focus:outline-none focus:border-secondary text-sm h-10 px-3 border border-base-content/10"
              @keyup.enter="submitAddPath"
            />
            <div class="flex items-center justify-start text-xs mt-0.5">
              <button 
                type="button" 
                @click="switchToDropdown" 
                class="text-secondary/80 hover:text-secondary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <ArrowLeftIcon class="h-3 w-3" />
                <span>{{ t('settings.backToPathDropdown') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Mode 2: No torrent save paths detected -->
        <div v-else class="flex flex-col gap-3">
          <div class="p-3 bg-base-300/40 border border-base-content/10 rounded-xl text-xs opacity-75 flex items-center gap-2">
            <InfoIcon class="h-4 w-4 shrink-0 text-info" />
            <span>{{ t('settings.noTorrentPathsFound') }}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold opacity-75">{{ t('settings.manualPathInputLabel') }}</label>
            <input
              ref="customInputRef"
              v-model="manualPathInput"
              type="text"
              :placeholder="t('settings.addPathPlaceholder')"
              class="input input-bordered w-full rounded-xl bg-base-300 focus:outline-none focus:border-secondary text-sm h-10 px-3 border border-base-content/10"
              @keyup.enter="submitAddPath"
            />
          </div>
        </div>

        <div class="modal-action mt-4 gap-2">
          <button type="button" class="btn btn-neutral btn-sm rounded-xl font-bold" @click="showAddPathModal = false">
            {{ t('common.cancel') }}
          </button>
          <button 
            type="button" 
            class="btn btn-secondary btn-sm rounded-xl font-bold" 
            :disabled="!canSubmitAddPath"
            @click="submitAddPath"
          >
            {{ t('settings.addPathBtn') }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop bg-black/40 backdrop-blur-xs" @click="showAddPathModal = false"></div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import CustomSelect from '@/components/CustomSelect.vue';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import {
  ArrowLeftIcon,
  RadioIcon,
  PaletteIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LayersIcon,
  ShieldAlertIcon,
  CookieIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
  LanguagesIcon,
  DownloadIcon,
  CpuIcon,
  SparklesIcon,
  KeyRoundIcon,
  MenuIcon,
  EyeIcon,
  EyeOffIcon,
  SlidersIcon,
  TagIcon,
  HardDriveIcon,
  GlobeIcon,
  InboxIcon,
  AlertTriangleIcon,
  CopyIcon,
  GaugeIcon,
  InfoIcon,
} from 'lucide-vue-next';

const appStore = useAppStore();
const torrentStore = useTorrentStore();
const { t } = useI18n();
const isDev = import.meta.env.DEV;

const driverOptions = [
  { value: 'qbittorrent', label: 'qBittorrent (HTTP API v2)' },
  { value: 'transmission', label: 'Transmission (JSON-RPC) - Coming soon', disabled: true },
  { value: 'aria2', label: 'Aria2 (JSON-RPC) - Coming soon', disabled: true },
];

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

const autoDeleteModeOptions = computed(() => [
  { value: 0, label: t('dashboard.autoDeleteNever') },
  { value: 1, label: t('dashboard.autoDeleteIfAdded') },
  { value: 2, label: t('dashboard.autoDeleteAlways') },
]);

const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');
const errorLog = ref<string | null>(null);

// Read initial tab from hash query (e.g. #/settings?tab=download)
function getInitialTab(): 'general' | 'download' | 'speed' | 'connection' | 'bittorrent' | 'simulation' {
  const hash = window.location.hash; // e.g. "#/settings?tab=download"
  const queryStart = hash.indexOf('?');
  if (queryStart !== -1) {
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const tab = params.get('tab');
    if (
      tab === 'download' ||
      tab === 'speed' ||
      tab === 'connection' ||
      tab === 'bittorrent' ||
      (tab === 'simulation' && isDev) ||
      tab === 'general'
    ) {
      return tab as any;
    }
  }
  return 'general';
}

const activeTab = ref<'general' | 'download' | 'speed' | 'connection' | 'bittorrent' | 'simulation'>(getInitialTab());
const showMobileMenu = ref(false);

function selectTab(tab: 'general' | 'download' | 'speed' | 'connection' | 'bittorrent' | 'simulation') {
  if (tab === 'simulation' && !isDev) {
    activeTab.value = 'general';
  } else {
    activeTab.value = tab;
  }
  showMobileMenu.value = false;
}

function getTabLabel(tab: 'general' | 'download' | 'speed' | 'connection' | 'bittorrent' | 'simulation') {
  switch (tab) {
    case 'general': return t('settings.tabGeneral');
    case 'download': return t('settings.tabDownload');
    case 'speed': return t('settings.tabSpeed');
    case 'connection': return t('settings.tabConnection');
    case 'bittorrent': return t('settings.tabBitTorrent');
    case 'simulation': return t('settings.tabSimulation');
    default: return '';
  }
}

const prefs = reactive({
  preallocate_all: false,
  incomplete_files_ext: false,
  use_unwanted_folder: false,
  auto_tmm_enabled: false,
  torrent_changed_tmm_enabled: false,
  save_path_changed_tmm_enabled: false,
  category_changed_tmm_enabled: false,
  use_category_paths_in_manual_mode: false,
  export_dir: '',
  export_dir_fin: '',
  download_in_scan_dirs: false,
  scan_dirs: {} as Record<string, number | string>,
  up_limit: 0,
  dl_limit: 0,
  alt_up_limit: 0,
  alt_dl_limit: 0,
  scheduler_enabled: false,
  schedule_from_hour: 0,
  schedule_from_min: 0,
  schedule_to_hour: 0,
  schedule_to_min: 0,
  scheduler_days: 0,
  bittorrent_protocol: 0,
  listen_port: 0,
  upnp: false,
  max_connec: 0,
  max_connec_per_torrent: 0,
  max_uploads: 0,
  max_uploads_per_torrent: 0,
  proxy_type: -1,
  proxy_ip: '',
  proxy_port: 0,
  proxy_peer_connections: false,
  proxy_username: '',
  proxy_password: '',
  dht: false,
  pex: false,
  lsd: false,
  encryption: 0,
  anonymous_mode: false,
  queueing_enabled: false,
  max_active_downloads: 0,
  max_active_uploads: 0,
  max_active_torrents: 0,
  dont_count_slow_torrents: false,
});
const savingPrefs = ref(false);

const upLimitUnit = ref<'KiB' | 'MiB'>('KiB');
const dlLimitUnit = ref<'KiB' | 'MiB'>('KiB');
const altUpLimitUnit = ref<'KiB' | 'MiB'>('KiB');
const altDlLimitUnit = ref<'KiB' | 'MiB'>('KiB');

const upLimitDisplay = computed({
  get() {
    if (prefs.up_limit <= 0) return 0;
    const divider = upLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    return Math.round(prefs.up_limit / divider);
  },
  set(val: number) {
    const multiplier = upLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    updatePref('up_limit', Math.max(0, val) * multiplier);
  }
});

const dlLimitDisplay = computed({
  get() {
    if (prefs.dl_limit <= 0) return 0;
    const divider = dlLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    return Math.round(prefs.dl_limit / divider);
  },
  set(val: number) {
    const multiplier = dlLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    updatePref('dl_limit', Math.max(0, val) * multiplier);
  }
});

const altUpLimitDisplay = computed({
  get() {
    if (prefs.alt_up_limit <= 0) return 0;
    const divider = altUpLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    return Math.round(prefs.alt_up_limit / divider);
  },
  set(val: number) {
    const multiplier = altUpLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    updatePref('alt_up_limit', Math.max(0, val) * multiplier);
  }
});

const altDlLimitDisplay = computed({
  get() {
    if (prefs.alt_dl_limit <= 0) return 0;
    const divider = altDlLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    return Math.round(prefs.alt_dl_limit / divider);
  },
  set(val: number) {
    const multiplier = altDlLimitUnit.value === 'MiB' ? 1024 * 1024 : 1024;
    updatePref('alt_dl_limit', Math.max(0, val) * multiplier);
  }
});

function incrementSpeed(key: 'up_limit' | 'dl_limit' | 'alt_up_limit' | 'alt_dl_limit') {
  const currentVal = prefs[key] || 0;
  const unit = key === 'up_limit' ? upLimitUnit.value : key === 'dl_limit' ? dlLimitUnit.value : key === 'alt_up_limit' ? altUpLimitUnit.value : altDlLimitUnit.value;
  const step = unit === 'MiB' ? 1024 * 1024 : 10 * 1024;
  updatePref(key, Math.max(0, currentVal + step));
}

function decrementSpeed(key: 'up_limit' | 'dl_limit' | 'alt_up_limit' | 'alt_dl_limit') {
  const currentVal = prefs[key] || 0;
  const unit = key === 'up_limit' ? upLimitUnit.value : key === 'dl_limit' ? dlLimitUnit.value : key === 'alt_up_limit' ? altUpLimitUnit.value : altDlLimitUnit.value;
  const step = unit === 'MiB' ? 1024 * 1024 : 10 * 1024;
  updatePref(key, Math.max(0, currentVal - step));
}

async function fetchServerPreferences() {
  if (!torrentStore.isConnected && !appStore.simulationMode) return;
  try {
    const data = await torrentStore.getPreferences();
    if (data) {
      prefs.preallocate_all = !!data.preallocate_all;
      prefs.incomplete_files_ext = !!data.incomplete_files_ext;
      prefs.use_unwanted_folder = !!data.use_unwanted_folder;
      prefs.auto_tmm_enabled = !!data.auto_tmm_enabled;
      prefs.torrent_changed_tmm_enabled = !!data.torrent_changed_tmm_enabled;
      prefs.save_path_changed_tmm_enabled = !!data.save_path_changed_tmm_enabled;
      prefs.category_changed_tmm_enabled = !!data.category_changed_tmm_enabled;
      prefs.use_category_paths_in_manual_mode = !!data.use_category_paths_in_manual_mode;
      prefs.export_dir = data.export_dir || '';
      prefs.export_dir_fin = data.export_dir_fin || '';
      prefs.download_in_scan_dirs = !!data.download_in_scan_dirs;
      prefs.scan_dirs = data.scan_dirs || {};
      prefs.up_limit = data.up_limit !== undefined ? data.up_limit : 0;
      prefs.dl_limit = data.dl_limit !== undefined ? data.dl_limit : 0;
      prefs.alt_up_limit = data.alt_up_limit !== undefined ? data.alt_up_limit : 0;
      prefs.alt_dl_limit = data.alt_dl_limit !== undefined ? data.alt_dl_limit : 0;
      prefs.scheduler_enabled = !!data.scheduler_enabled;
      prefs.schedule_from_hour = data.schedule_from_hour !== undefined ? data.schedule_from_hour : 0;
      prefs.schedule_from_min = data.schedule_from_min !== undefined ? data.schedule_from_min : 0;
      prefs.schedule_to_hour = data.schedule_to_hour !== undefined ? data.schedule_to_hour : 0;
      prefs.schedule_to_min = data.schedule_to_min !== undefined ? data.schedule_to_min : 0;
      prefs.scheduler_days = data.scheduler_days !== undefined ? data.scheduler_days : 0;

      prefs.bittorrent_protocol = data.bittorrent_protocol !== undefined ? data.bittorrent_protocol : 0;
      prefs.listen_port = data.listen_port !== undefined ? data.listen_port : 0;
      prefs.upnp = !!data.upnp;
      prefs.max_connec = data.max_connec !== undefined ? data.max_connec : 500;
      prefs.max_connec_per_torrent = data.max_connec_per_torrent !== undefined ? data.max_connec_per_torrent : 100;
      prefs.max_uploads = data.max_uploads !== undefined ? data.max_uploads : 80;
      prefs.max_uploads_per_torrent = data.max_uploads_per_torrent !== undefined ? data.max_uploads_per_torrent : 20;
      prefs.proxy_type = data.proxy_type !== undefined ? data.proxy_type : -1;
      prefs.proxy_ip = data.proxy_ip || '';
      prefs.proxy_port = data.proxy_port !== undefined ? data.proxy_port : 8080;
      prefs.proxy_peer_connections = !!data.proxy_peer_connections;
      prefs.proxy_username = data.proxy_username || '';
      prefs.proxy_password = data.proxy_password || '';

      prefs.dht = data.dht !== undefined ? !!data.dht : true;
      prefs.pex = data.pex !== undefined ? !!data.pex : true;
      prefs.lsd = data.lsd !== undefined ? !!data.lsd : true;
      prefs.encryption = data.encryption !== undefined ? data.encryption : 0;
      prefs.anonymous_mode = !!data.anonymous_mode;
      prefs.queueing_enabled = !!data.queueing_enabled;
      prefs.max_active_downloads = data.max_active_downloads !== undefined ? data.max_active_downloads : 3;
      prefs.max_active_uploads = data.max_active_uploads !== undefined ? data.max_active_uploads : 3;
      prefs.max_active_torrents = data.max_active_torrents !== undefined ? data.max_active_torrents : 5;
      prefs.dont_count_slow_torrents = !!data.dont_count_slow_torrents;

      upLimitUnit.value = (prefs.up_limit > 0 && prefs.up_limit % (1024 * 1024) === 0) ? 'MiB' : 'KiB';
      dlLimitUnit.value = (prefs.dl_limit > 0 && prefs.dl_limit % (1024 * 1024) === 0) ? 'MiB' : 'KiB';
      altUpLimitUnit.value = (prefs.alt_up_limit > 0 && prefs.alt_up_limit % (1024 * 1024) === 0) ? 'MiB' : 'KiB';
      altDlLimitUnit.value = (prefs.alt_dl_limit > 0 && prefs.alt_dl_limit % (1024 * 1024) === 0) ? 'MiB' : 'KiB';
    }
  } catch (err) {
    console.error('Failed to load server preferences:', err);
  }
}

async function updatePref(
  key:
    | 'preallocate_all'
    | 'incomplete_files_ext'
    | 'use_unwanted_folder'
    | 'auto_tmm_enabled'
    | 'torrent_changed_tmm_enabled'
    | 'save_path_changed_tmm_enabled'
    | 'category_changed_tmm_enabled'
    | 'use_category_paths_in_manual_mode'
    | 'export_dir'
    | 'export_dir_fin'
    | 'download_in_scan_dirs'
    | 'scan_dirs'
    | 'up_limit'
    | 'dl_limit'
    | 'alt_up_limit'
    | 'alt_dl_limit'
    | 'scheduler_enabled'
    | 'schedule_from_hour'
    | 'schedule_from_min'
    | 'schedule_to_hour'
    | 'schedule_to_min'
    | 'scheduler_days'
    | 'bittorrent_protocol'
    | 'listen_port'
    | 'upnp'
    | 'max_connec'
    | 'max_connec_per_torrent'
    | 'max_uploads'
    | 'max_uploads_per_torrent'
    | 'proxy_type'
    | 'proxy_ip'
    | 'proxy_port'
    | 'proxy_peer_connections'
    | 'proxy_username'
    | 'proxy_password'
    | 'dht'
    | 'pex'
    | 'lsd'
    | 'encryption'
    | 'anonymous_mode'
    | 'queueing_enabled'
    | 'max_active_downloads'
    | 'max_active_uploads'
    | 'max_active_torrents'
    | 'dont_count_slow_torrents',
  value: boolean | string | number | Record<string, number | string>
) {
  savingPrefs.value = true;
  try {
    const success = await torrentStore.setPreferences({ [key]: value });
    if (success) {
      (prefs as any)[key] = value;
    } else {
      alert(t('settings.updatePreferencesFailed', { error: 'Unknown error' }));
    }
  } catch (err: any) {
    alert(t('settings.updatePreferencesFailed', { error: err.message || err }));
    await fetchServerPreferences();
  } finally {
    savingPrefs.value = false;
  }
}

function randomizePort() {
  const port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
  updatePref('listen_port', port);
}

watch([activeTab, () => torrentStore.isConnected], async ([newTab, isConnected]) => {
  if ((newTab === 'download' || newTab === 'speed' || newTab === 'connection' || newTab === 'bittorrent') && (isConnected || appStore.simulationMode)) {
    await fetchServerPreferences();
  }
}, { immediate: true });
const newCategoryInput = ref('');
const showCreateCategoryModal = ref(false);

function openCreateCategoryModal() {
  newCategoryInput.value = '';
  showCreateCategoryModal.value = true;
}

async function submitCreateCategory() {
  const name = newCategoryInput.value.trim();
  if (name) {
    await torrentStore.createCategory(name);
  }
  showCreateCategoryModal.value = false;
}

const activeCategoryForPath = ref('');
const selectedPathOption = ref('');
const manualPathInput = ref('');
const isManualPathInput = ref(false);
const showAddPathModal = ref(false);
const customInputRef = ref<HTMLInputElement | null>(null);

const addPathSelectOptions = computed(() => {
  const existingCat = appStore.categoryConfigs.find((c) => c.name === activeCategoryForPath.value);
  const alreadyAdded = existingCat ? existingCat.paths : [];

  const options = torrentStore.torrentSavePaths.map((item) => {
    const isAdded = alreadyAdded.includes(item.path);
    return {
      value: item.path,
      label: isAdded
        ? `${item.path} (${t('settings.pathAlreadyAdded')})`
        : item.count > 1
          ? `${item.path} (${item.count})`
          : item.path,
      disabled: isAdded,
    };
  });

  options.push({
    value: '__custom__',
    label: t('settings.customPathOption'),
    disabled: false,
  });

  return options;
});

const canSubmitAddPath = computed(() => {
  if (torrentStore.torrentSavePaths.length === 0 || isManualPathInput.value || selectedPathOption.value === '__custom__') {
    return manualPathInput.value.trim().length > 0;
  }
  return selectedPathOption.value.trim().length > 0 && selectedPathOption.value !== '__custom__';
});

function openAddPathModal(catName: string) {
  activeCategoryForPath.value = catName;
  manualPathInput.value = '';

  const existingCat = appStore.categoryConfigs.find((c) => c.name === catName);
  const alreadyAdded = existingCat ? existingCat.paths : [];

  // Find first path that is not yet added to this category
  const available = torrentStore.torrentSavePaths.filter((item) => !alreadyAdded.includes(item.path));

  if (available.length > 0) {
    selectedPathOption.value = available[0].path;
    isManualPathInput.value = false;
  } else if (torrentStore.torrentSavePaths.length > 0) {
    // All existing paths are already added
    selectedPathOption.value = '__custom__';
    isManualPathInput.value = true;
  } else {
    // No torrent paths found
    selectedPathOption.value = '__custom__';
    isManualPathInput.value = true;
  }

  showAddPathModal.value = true;
  if (isManualPathInput.value) {
    nextTick(() => {
      customInputRef.value?.focus();
    });
  }
}

function onPathOptionChange(val: string) {
  if (val === '__custom__') {
    isManualPathInput.value = true;
    nextTick(() => {
      customInputRef.value?.focus();
    });
  } else {
    isManualPathInput.value = false;
  }
}

function switchToManual() {
  isManualPathInput.value = true;
  if (selectedPathOption.value && selectedPathOption.value !== '__custom__') {
    manualPathInput.value = selectedPathOption.value;
  }
  selectedPathOption.value = '__custom__';
  nextTick(() => {
    customInputRef.value?.focus();
  });
}

function switchToDropdown() {
  isManualPathInput.value = false;
  const existingCat = appStore.categoryConfigs.find((c) => c.name === activeCategoryForPath.value);
  const alreadyAdded = existingCat ? existingCat.paths : [];
  const available = torrentStore.torrentSavePaths.filter((item) => !alreadyAdded.includes(item.path));
  if (available.length > 0) {
    selectedPathOption.value = available[0].path;
  } else if (torrentStore.torrentSavePaths.length > 0) {
    selectedPathOption.value = torrentStore.torrentSavePaths[0].path;
  }
}

function submitAddPath() {
  let targetPath = '';
  if (torrentStore.torrentSavePaths.length === 0 || isManualPathInput.value || selectedPathOption.value === '__custom__') {
    targetPath = manualPathInput.value.trim();
  } else {
    targetPath = selectedPathOption.value.trim();
  }

  if (targetPath && activeCategoryForPath.value) {
    appStore.addPathToCategory(activeCategoryForPath.value, targetPath);
  }
  showAddPathModal.value = false;
}

const newWatchPath = ref('');
const newSaveLocationType = ref<'default' | 'monitored' | 'custom'>('default');
const newCustomSavePath = ref('');

async function addWatchFolder() {
  const watchPath = newWatchPath.value.trim().replace(/\\/g, '/');
  if (!watchPath) return;

  let value: number | string = 0;
  if (newSaveLocationType.value === 'monitored') {
    value = 1;
  } else if (newSaveLocationType.value === 'custom') {
    const customPath = newCustomSavePath.value.trim().replace(/\\/g, '/');
    if (!customPath) return;
    value = customPath;
  }

  const updatedScanDirs = { ...prefs.scan_dirs, [watchPath]: value };
  await updatePref('scan_dirs', updatedScanDirs);

  newWatchPath.value = '';
  newSaveLocationType.value = 'default';
  newCustomSavePath.value = '';
}

async function removeWatchFolder(watchPath: string) {
  if (confirm(t('settings.deleteWatchFolderConfirm', { path: watchPath }))) {
    const updatedScanDirs = { ...prefs.scan_dirs };
    delete updatedScanDirs[watchPath];
    await updatePref('scan_dirs', updatedScanDirs);
  }
}

const form = reactive({
  url: '',
  username: '',
  password: '',
  driverType: 'qbittorrent' as 'qbittorrent' | 'transmission' | 'aria2',
});

const changeCredForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
});

const changeCredStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const changeCredError = ref<string | null>(null);

async function handleChangeCredentials() {
  if (changeCredForm.password !== changeCredForm.confirmPassword) {
    changeCredStatus.value = 'error';
    changeCredError.value = t('settings.passwordsNotMatch');
    return;
  }

  changeCredStatus.value = 'loading';
  changeCredError.value = null;

  try {
    const tStore = useTorrentStore();
    await tStore.changeCredentials(changeCredForm.username, changeCredForm.password);
    changeCredStatus.value = 'success';
    
    // Update local connection form state to match
    form.username = changeCredForm.username;
    form.password = changeCredForm.password;

    // Reset password inputs
    changeCredForm.password = '';
    changeCredForm.confirmPassword = '';
  } catch (err: any) {
    changeCredStatus.value = 'error';
    changeCredError.value = err.message || t('settings.credentialsChangeFailed');
  }
}

// Sync store values into local form
onMounted(() => {
  form.url = appStore.url;
  form.username = appStore.username;
  form.password = appStore.password;
  form.driverType = appStore.driverType;
  changeCredForm.username = appStore.username;
  // Re-read tab from hash in case navigation happened after mount
  const tab = getInitialTab();
  activeTab.value = tab;
  window.addEventListener('click', handleWindowClick);

  loadSidebarConfig();

  // Attempt connection boot if not connected yet and not polling
  if (!torrentStore.isConnected && !torrentStore.isPollingActive) {
    torrentStore.bootClient().then(() => {
      torrentStore.triggerSyncLoop();
    }).catch((e) => {
      console.warn('Settings boot sync connection not ready:', e);
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('click', handleWindowClick);
});

// Available Swatch Themes configurations matching official DaisyUI palettes
const availableThemes = [
  { name: 'cyberpunk', primary: '#ff007f', secondary: '#00ffc8', accent: '#ffe600', neutral: '#1b0030' },
  { name: 'dracula', primary: '#ff79c6', secondary: '#8be9fd', accent: '#ffb86c', neutral: '#414558' },
  { name: 'aqua', primary: '#09ecf3', secondary: '#966fb3', accent: '#ffe999', neutral: '#3b8ac4' },
  { name: 'nord', primary: '#5e81ac', secondary: '#81a1c1', accent: '#88c0d0', neutral: '#2e3440' },
  { name: 'light', primary: '#570df8', secondary: '#f000b8', accent: '#37cdbe', neutral: '#3d4451' },
  { name: 'dark', primary: '#661ae6', secondary: '#d926aa', accent: '#1db88e', neutral: '#191d24' },
  { name: 'cupcake', primary: '#65c3c8', secondary: '#ef9fbc', accent: '#eeaf3a', neutral: '#291334' },
  { name: 'emerald', primary: '#66cc8a', secondary: '#377cfb', accent: '#ea5234', neutral: '#333c4d' },
  { name: 'synthwave', primary: '#e779c1', secondary: '#8becfd', accent: '#f1c891', neutral: '#191528' },
  { name: 'retro', primary: '#ef9fbc', secondary: '#65c3c8', accent: '#eeaf3a', neutral: '#291334' },
  { name: 'valentine', primary: '#e96d7b', secondary: '#a991f7', accent: '#88c0d0', neutral: '#353d42' },
  { name: 'halloween', primary: '#f28c18', secondary: '#6d3b97', accent: '#51a800', neutral: '#1b1d22' },
  { name: 'forest', primary: '#1eb854', secondary: '#1fd8a4', accent: '#1f9f2f', neutral: '#111827' },
  { name: 'business', primary: '#1c4e80', secondary: '#7c90c1', accent: '#9d2235', neutral: '#1f2937' },
  { name: 'night', primary: '#38bdf8', secondary: '#818cf8', accent: '#f472b6', neutral: '#1e293b' },
  { name: 'coffee', primary: '#db924b', secondary: '#263e3f', accent: '#10576d', neutral: '#120c12' },
  { name: 'winter', primary: '#047aff', secondary: '#463aa1', accent: '#c149ad', neutral: '#212121' },
  { name: 'dim', primary: '#9fb9d0', secondary: '#f05562', accent: '#ffe066', neutral: '#2a323c' },
  { name: 'sunset', primary: '#ff7e5f', secondary: '#feb47b', accent: '#ffe066', neutral: '#1a1a1a' },
];

const currentThemeColors = computed(() => {
  return availableThemes.find(t => t.name === appStore.theme) || availableThemes[0];
});



const isDropdownOpen = ref(false);
const dropdownContainer = ref<HTMLElement | null>(null);
const dropdownMenu = ref<HTMLElement | null>(null);

function toggleThemeDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    nextTick(() => {
      if (dropdownMenu.value) {
        const activeEl = dropdownMenu.value.querySelector('.text-secondary');
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      }
    });
  }
}

function selectThemeOption(themeName: string) {
  changeTheme(themeName);
  isDropdownOpen.value = false;
}

function handleWindowClick(e: Event) {
  if (dropdownContainer.value && !dropdownContainer.value.contains(e.target as Node)) {
    isDropdownOpen.value = false;
  }
}

function changeTheme(themeName: string) {
  appStore.setTheme(themeName);
}

async function testConnection() {
  testStatus.value = 'testing';
  errorLog.value = null;

  try {
    // Write temporarily to local storage so adapter axios request fetches it
    localStorage.setItem(
      'torrenta_app_config',
      JSON.stringify({ url: form.url, username: form.username })
    );

    // Boot client using the factory adapter connect mechanism
    const tempStore = useTorrentStore();
    
    // Save state temporarily
    appStore.saveConfig(form.url, form.username, form.password, form.driverType);
    await tempStore.bootClient();
    
    testStatus.value = 'success';
  } catch (err: any) {
    testStatus.value = 'error';
    errorLog.value = err.message || t('settings.connTimeout');
  }
}

function saveSettings() {
  appStore.saveConfig(form.url, form.username, form.password, form.driverType);
  testStatus.value = 'success';
  
  // Reboot store loop
  torrentStore.bootClient().then(() => {
    torrentStore.triggerSyncLoop();
    alert(t('settings.saveSuccess'));
  }).catch((e) => {
    console.error('Reboot loop failed with config save', e);
    alert(t('settings.saveError') + (e.message || e));
  });
}

function toggleSimulationMode(e: Event) {
  const checkbox = e.target as HTMLInputElement;
  appStore.setSimulationMode(checkbox.checked);
  
  // Reboot torrent store connection status and sync loops
  torrentStore.bootClient().then(() => {
    torrentStore.triggerSyncLoop();
  }).catch((err) => {
    console.error('Reboot loop failed during simulation toggle', err);
  });
}

function handleSimulatedCountChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseInt(target.value, 10);
  appStore.setSimulatedCount(val);
  
  // Instantly regenerate mock list to match new count
  torrentStore.resetSimulatedData();
}

function handleRegenerateSimData() {
  torrentStore.resetSimulatedData();
  alert(t('settings.simDataRegenerated'));
}

// Sidebar customization logic
const sectionsOrder = computed(() => appStore.sidebarOrder);

function loadSidebarConfig() {
  // Sidebar config is automatically hydrated and synchronized by appStore
}

function moveSection(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  const current = [...appStore.sidebarOrder];
  if (newIndex < 0 || newIndex >= current.length) return;
  
  const temp = current[index];
  current[index] = current[newIndex];
  current[newIndex] = temp;
  
  appStore.setSidebarOrder(current);
}

function toggleSectionVisibility(id: string) {
  if (id === 'status') return;
  
  let currentHidden = [...appStore.sidebarHidden];
  if (currentHidden.includes(id)) {
    currentHidden = currentHidden.filter((x) => x !== id);
  } else {
    currentHidden.push(id);
  }
  
  appStore.setSidebarHidden(currentHidden);
}

function isSectionVisible(id: string): boolean {
  if (id === 'status') return true;
  return !appStore.sidebarHidden.includes(id);
}

function getSectionLabel(id: string): string {
  switch (id) {
    case 'status': return t('sidebar.statusFilters');
    case 'category': return t('sidebar.categories');
    case 'tag': return t('sidebar.tags');
    case 'savepath': return t('sidebar.savePath');
    case 'tracker': return t('sidebar.tracker');
    default: return id;
  }
}

function getSectionIcon(id: string) {
  switch (id) {
    case 'status': return InboxIcon;
    case 'category': return FolderIcon;
    case 'tag': return TagIcon;
    case 'savepath': return HardDriveIcon;
    case 'tracker': return GlobeIcon;
    default: return SlidersIcon;
  }
}
</script>
