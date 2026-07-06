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
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
      <!-- Left Navigation Menu (Desktop persistent sidebar, Mobile drawer overlay) -->
      <aside
        class="md:col-span-1 transition-all duration-300 md:flex flex-col gap-2 bg-base-100/50 p-3 rounded-2xl border border-base-content/10"
        :class="showMobileMenu ? 'fixed inset-0 z-[100] p-4 bg-black/60 backdrop-blur-sm flex justify-start' : 'hidden md:flex'"
        @click.self="showMobileMenu = false"
      >
        <div
          class="w-72 max-w-[85%] md:w-full h-full md:h-auto bg-base-200 md:bg-transparent p-4 md:p-0 rounded-2xl border border-base-content/10 md:border-none flex flex-col gap-2 shadow-2xl md:shadow-none"
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
            @click="selectTab('connection')"
            class="btn btn-sm justify-start gap-2.5 rounded-xl font-bold w-full border-none shadow-none text-left h-10 animate-fadeIn"
            :class="activeTab === 'connection' ? 'bg-primary text-primary-content hover:bg-primary/95' : 'bg-transparent hover:bg-base-content/10'"
          >
            <RadioIcon class="h-4 w-4" /> {{ t('settings.tabConnection') }}
          </button>
          <button
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
      <main class="md:col-span-3 flex flex-col gap-6">
        <!-- 1. General Panel (Language first, Theme second) -->
        <div v-if="activeTab === 'general'" class="flex flex-col gap-6 animate-fadeIn">
          <!-- UI Language Switcher Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 animate-fadeIn relative z-20">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <LanguagesIcon class="h-5 w-5 text-primary" /> {{ t('settings.languageTitle') }}
            </h2>

            <div class="flex flex-col gap-3 text-left">
              <span class="text-xs opacity-60">{{ t('settings.languageDesc') }}</span>
              
              <div class="flex flex-col sm:flex-row items-center gap-4 mt-1">
                <div class="relative w-full sm:max-w-xs">
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
            </div>
          </div>

          <!-- UI Theme Selector Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 relative z-10">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <PaletteIcon class="h-5 w-5 text-secondary" /> {{ t('settings.uiThemes') }}
            </h2>

            <div class="flex flex-col gap-3 text-left">
              <span class="text-xs opacity-60">{{ t('settings.themeDesc') }}</span>
              
              <div class="flex flex-col sm:flex-row items-center gap-4 mt-1">
                <!-- Custom Styled Theme Dropdown (No Double Arrows) -->
                <div class="relative w-full sm:max-w-xs" ref="dropdownContainer">
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
                <div class="flex items-center gap-3 bg-base-200/50 px-4 py-2.5 rounded-xl border border-base-content/10 select-none">
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
          </div>

          <!-- Sidebar Customization Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 relative z-0 mt-6 animate-fadeIn">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <SlidersIcon class="h-5 w-5 text-accent" /> {{ t('settings.sidebarCustomization') }}
            </h2>

            <div class="flex flex-col gap-3 text-left">
              <span class="text-xs opacity-60">{{ t('settings.sidebarCustomizationDesc') }}</span>
              
              <div class="mt-2 border border-base-content/10 rounded-xl overflow-hidden divide-y divide-base-content/10 bg-base-200 w-full">
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
        </div>

        <!-- 2. Download Panel (Category setup) -->
        <div v-if="activeTab === 'download'" class="flex flex-col gap-6 animate-fadeIn">
          <!-- Categories & Paths Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <FolderIcon class="h-5 w-5 text-primary" /> {{ t('settings.categoryPaths') }}
            </h2>

            <div class="flex flex-col gap-4 text-left">
              <!-- Add new category form -->
              <div class="flex flex-col gap-1.5 p-3.5 bg-base-200/50 rounded-xl border border-base-content/5">
                <span class="text-xs font-bold opacity-75 uppercase">{{ t('settings.createCategory') }}</span>
                <div class="flex gap-2">
                  <input
                    v-model="newCategoryInput"
                    type="text"
                    :placeholder="t('settings.categoryPlaceholder')"
                    class="input input-bordered input-sm flex-1 rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-9 px-3 border border-base-content/10"
                    @keyup.enter="handleCreateCategory"
                  />
                  <button type="button" @click="handleCreateCategory" class="btn btn-primary btn-sm h-9 rounded-xl font-bold flex items-center gap-1">
                    <PlusIcon class="h-4 w-4" /> {{ t('common.create') }}
                  </button>
                </div>
              </div>

              <!-- List of Categories with their paths -->
              <div v-if="appStore.categoryConfigs.length > 0" class="flex flex-col gap-4 mt-2">
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
                    <button type="button" @click="appStore.removeCategory(cat.name)" class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/15 h-6 w-6" :title="t('settings.removeCategory')">
                      <TrashIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <!-- Add path to this Category form -->
                  <div class="flex gap-2 mt-1">
                    <input
                      v-model="categoryPathInputs[cat.name]"
                      type="text"
                      :placeholder="t('settings.addPathPlaceholder')"
                      class="input input-bordered input-sm flex-1 rounded-xl bg-base-200 focus:outline-none focus:border-secondary text-xs h-8 px-2 border border-base-content/10"
                      @keyup.enter="handleAddPathToCategory(cat.name)"
                    />
                    <button type="button" @click="handleAddPathToCategory(cat.name)" class="btn btn-secondary btn-sm h-8 rounded-xl font-bold text-xs px-3">
                      {{ t('settings.addPathBtn') }}
                    </button>
                  </div>

                  <!-- Paths list for this category -->
                  <div class="flex flex-col gap-1.5 mt-1.5">
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
          </div>
        </div>

        <!-- 2. Connection Panel -->
        <div v-if="activeTab === 'connection'" class="flex flex-col gap-6 animate-fadeIn">
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <RadioIcon class="h-5 w-5 text-primary" /> {{ t('settings.connParams') }}
            </h2>

            <div class="flex flex-col gap-4">
              <!-- Downloader Driver Type -->
              <div class="form-control w-full">
                <label class="label font-bold text-xs uppercase opacity-75">{{ t('settings.clientType') }}</label>
                <CustomSelect v-model="form.driverType" :options="driverOptions" />
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
              <div class="divider my-2 before:bg-base-content/10 after:bg-base-content/10"></div>
              
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

          <!-- Change Downloader WebUI Credentials Card -->
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 text-left animate-fadeIn">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <KeyRoundIcon class="h-5 w-5 text-secondary animate-pulse" /> {{ t('settings.changeCredentialsTitle') }}
            </h2>

            <p class="text-xs opacity-60 mb-4 leading-relaxed">
              {{ t('settings.changeCredentialsDesc') }}
            </p>

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


        <!-- 4. Simulation Panel -->
        <div v-if="activeTab === 'simulation'" class="flex flex-col gap-6 animate-fadeIn">
          <div class="card glassmorphic shadow-xl rounded-2xl border border-base-content/10 p-6 text-left">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
              <CpuIcon class="h-5 w-5 text-primary" /> {{ t('settings.simulationTitle') }}
            </h2>

            <div class="flex flex-col gap-5">
              <p class="text-xs opacity-60 leading-relaxed">
                {{ t('settings.simulationDesc') }}
              </p>

              <!-- Enable Simulation Toggle -->
              <div class="form-control bg-base-200/50 border border-base-content/5 p-4 rounded-xl flex flex-row items-center justify-between gap-4">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-bold">{{ t('settings.enableSimulation') }}</span>
                  <span class="text-[10px] opacity-50">开启后接管数据拉取，展示各种虚拟状态的种子</span>
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
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
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
} from 'lucide-vue-next';

const appStore = useAppStore();
const torrentStore = useTorrentStore();
const { t } = useI18n();

const driverOptions = [
  { value: 'qbittorrent', label: 'qBittorrent (HTTP API v2)' },
  { value: 'transmission', label: 'Transmission (JSON-RPC) - Coming soon', disabled: true },
  { value: 'aria2', label: 'Aria2 (JSON-RPC) - Coming soon', disabled: true },
];

const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');
const errorLog = ref<string | null>(null);

// Read initial tab from hash query (e.g. #/settings?tab=download)
function getInitialTab(): 'general' | 'download' | 'connection' | 'simulation' {
  const hash = window.location.hash; // e.g. "#/settings?tab=download"
  const queryStart = hash.indexOf('?');
  if (queryStart !== -1) {
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const tab = params.get('tab');
    if (tab === 'download' || tab === 'connection' || tab === 'simulation' || tab === 'general') {
      return tab;
    }
  }
  return 'general';
}

const activeTab = ref<'general' | 'download' | 'connection' | 'simulation'>(getInitialTab());
const showMobileMenu = ref(false);

function selectTab(tab: 'general' | 'download' | 'connection' | 'simulation') {
  activeTab.value = tab;
  showMobileMenu.value = false;
}

function getTabLabel(tab: 'general' | 'download' | 'connection' | 'simulation') {
  switch (tab) {
    case 'general': return t('settings.tabGeneral');
    case 'download': return t('settings.tabDownload');
    case 'connection': return t('settings.tabConnection');
    case 'simulation': return t('settings.tabSimulation');
    default: return '';
  }
}
const newCategoryInput = ref('');
const categoryPathInputs = reactive<Record<string, string>>({});

function handleCreateCategory() {
  const name = newCategoryInput.value.trim();
  if (name) {
    appStore.addCategory(name);
    newCategoryInput.value = '';
  }
}

function handleAddPathToCategory(catName: string) {
  const path = categoryPathInputs[catName]?.trim();
  if (path) {
    appStore.addPathToCategory(catName, path);
    categoryPathInputs[catName] = '';
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
  }).catch((e) => {
    console.error('Reboot loop failed with config save', e);
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
const STORAGE_ORDER_KEY = 'torrenta_sidebar_sections_order';
const STORAGE_HIDDEN_KEY = 'torrenta_sidebar_sections_hidden';
const defaultOrder = ['status', 'category', 'tag', 'savepath', 'tracker'];

const sectionsOrder = ref<string[]>([]);
const hiddenSections = ref<string[]>([]);

function loadSidebarConfig() {
  const storedOrder = localStorage.getItem(STORAGE_ORDER_KEY);
  if (storedOrder) {
    try {
      sectionsOrder.value = JSON.parse(storedOrder);
    } catch {
      sectionsOrder.value = [...defaultOrder];
    }
  } else {
    sectionsOrder.value = [...defaultOrder];
  }
  
  // Guarantee all default sections exist in case of version upgrades
  defaultOrder.forEach((id) => {
    if (!sectionsOrder.value.includes(id)) {
      sectionsOrder.value.push(id);
    }
  });

  const storedHidden = localStorage.getItem(STORAGE_HIDDEN_KEY);
  if (storedHidden) {
    try {
      hiddenSections.value = JSON.parse(storedHidden);
    } catch {
      hiddenSections.value = [];
    }
  } else {
    hiddenSections.value = [];
  }
}

function moveSection(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= sectionsOrder.value.length) return;
  
  const temp = sectionsOrder.value[index];
  sectionsOrder.value[index] = sectionsOrder.value[newIndex];
  sectionsOrder.value[newIndex] = temp;
  
  localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(sectionsOrder.value));
}

function toggleSectionVisibility(id: string) {
  if (id === 'status') return;
  
  if (hiddenSections.value.includes(id)) {
    hiddenSections.value = hiddenSections.value.filter((x) => x !== id);
  } else {
    hiddenSections.value.push(id);
  }
  
  localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify(hiddenSections.value));
}

function isSectionVisible(id: string): boolean {
  if (id === 'status') return true;
  return !hiddenSections.value.includes(id);
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
