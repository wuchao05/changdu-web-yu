<template>
  <div class="min-h-full bg-gradient-to-br from-slate-50 to-blue-50">
    <!-- 顶部导航栏 -->
    <header
      class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- 左侧：Logo和标题 -->
          <div class="flex items-center space-x-4">
            <div
              class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl"
            >
              <Icon icon="mdi:fire" class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                爆剧爆剪
              </h1>
              <p class="text-xs text-gray-500">精选热门短剧精彩片段</p>
            </div>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center space-x-3">
            <button
              v-if="false && accountStore.isSanrouLikeAccount && canUpload"
              @click="handleOpenUpload"
              class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Icon icon="mdi:cloud-upload" class="w-4 h-4" />
              <span>开始上传</span>
            </button>
            <!-- 返回首页按钮 -->
            <button
              @click="goBack"
              class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Icon icon="mdi:arrow-left" class="w-4 h-4" />
              <span>返回首页</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 置顶筛选区域 -->
    <div
      class="sticky top-16 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="filter-section">
          <!-- 紧凑的筛选布局 -->
          <div class="compact-filter-row">
            <!-- Tab 切换 -->
            <div class="tab-switcher">
              <button
                v-if="false"
                @click="activeTab = 'feishu'"
                :class="['tab-switch-btn', activeTab === 'feishu' ? 'active' : '']"
              >
                <Icon icon="mdi:clipboard-list" class="tab-icon-compact" />
                <span class="tab-text-compact">飞书清单</span>
              </button>
              <button
                @click="activeTab = 'new-drama'"
                :class="['tab-switch-btn', activeTab === 'new-drama' ? 'active' : '']"
              >
                <Icon icon="mdi:rocket-launch-outline" class="tab-icon-compact" />
                <span class="tab-text-compact">新剧抢跑</span>
              </button>
              <button
                @click="activeTab = 'ranking'"
                :class="['tab-switch-btn', activeTab === 'ranking' ? 'active' : '']"
              >
                <Icon icon="mdi:trophy" class="tab-icon-compact" />
                <span class="tab-text-compact">榜单剧</span>
              </button>
            </div>

            <!-- 搜索和查询 -->
            <div class="search-query-compact">
              <NInput
                v-model:value="searchKeyword"
                placeholder="搜索短剧名称..."
                clearable
                size="small"
                class="search-input-native"
                @input="handleSearchInput"
                @clear="clearSearch"
              >
                <template #prefix>
                  <Icon icon="mdi:magnify" class="w-4 h-4 text-gray-400" />
                </template>
              </NInput>
              <button
                @click="handleRefresh"
                :disabled="
                  loading ||
                  listSkeletonLoading ||
                  searchLoading ||
                  rankingLoading ||
                  (activeTab === 'feishu' && dramaStatusBoardRef?.loading)
                "
                class="refresh-btn-modern"
                :title="
                  loading ||
                  listSkeletonLoading ||
                  searchLoading ||
                  rankingLoading ||
                  (activeTab === 'feishu' && dramaStatusBoardRef?.loading)
                    ? '刷新中...'
                    : '刷新数据'
                "
              >
                <Icon
                  icon="mdi:refresh"
                  :class="[
                    'refresh-icon-modern',
                    loading ||
                    listSkeletonLoading ||
                    searchLoading ||
                    rankingLoading ||
                    (activeTab === 'feishu' && dramaStatusBoardRef?.loading)
                      ? 'animate-spin'
                      : '',
                  ]"
                />
              </button>
              <!-- 自动提交下载按钮（在新剧抢跑tab显示） -->
              <button
                v-if="activeTab === 'new-drama'"
                @click="showAutoSubmitModal = true"
                :disabled="isAutoSubmitForCurrentSubject || loading || listSkeletonLoading"
                :class="['pending-download-btn', isAutoSubmitForCurrentSubject ? 'active' : '']"
                :title="isAutoSubmitForCurrentSubject ? '自动提交运行中' : '自动提交下载'"
              >
                <Icon
                  icon="mdi:robot-outline"
                  :class="[
                    'pending-download-icon',
                    currentSubjectStatus.running && isAutoSubmitForCurrentSubject
                      ? 'animate-pulse'
                      : '',
                  ]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 二级 Tab 区域 - 仅在新剧抢跑时显示 -->
    <div
      v-if="!isSearching && activeTab === 'new-drama'"
      class="sticky secondary-tab-sticky z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div class="secondary-tab-container">
          <!-- 日期筛选二级 Tab -->
          <div class="secondary-tab-switcher">
            <button
              v-for="date in dateOptions"
              :key="date.value"
              @click="selectedDate = date.value"
              :class="['secondary-tab-btn', selectedDate === date.value ? 'active' : '']"
            >
              <Icon :icon="getDateIcon(date.value)" class="secondary-tab-icon" />
              <span class="secondary-tab-text">{{ date.label }}</span>
              <span v-if="getDateDramaCount(date.value) > 0" class="secondary-tab-count">
                {{ getDateDramaCount(date.value) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-2 sm:pt-2 md:pt-2">
      <!-- 自动提交下载状态栏 -->
      <div
        v-if="isAutoSubmitForCurrentSubject && activeTab === 'new-drama'"
        class="auto-download-bar"
      >
        <div class="auto-download-info">
          <Icon icon="mdi:robot-outline" class="auto-download-icon" />
          <div>
            <div class="auto-download-title">自动提交下载</div>
            <div class="auto-download-desc">
              <span v-if="currentSubjectStatus.running">
                正在处理【{{ currentSubjectStatus.progress.currentDate }}】第
                {{ currentSubjectStatus.progress.current }}/{{
                  currentSubjectStatus.progress.total
                }}
                部：{{ currentSubjectStatus.progress.currentDrama }}
              </span>
              <span v-else> 下次运行倒计时：{{ formatCountdown(autoSubmitCountdown) }} </span>
            </div>
          </div>
        </div>
        <div class="auto-download-actions">
          <button
            class="auto-download-button stop"
            :disabled="currentSubjectStatus.running"
            @click="stopAutoSubmit"
          >
            {{ currentSubjectStatus.running ? '正在运行...' : '停止自动提交' }}
          </button>
        </div>
      </div>

      <!-- 搜索结果列表 - 优先显示搜索结果，在所有tab中都显示 -->
      <div v-if="isSearching && !searchLoading && searchResults.length > 0" class="drama-list">
        <DramaCard
          v-for="drama in searchResults"
          :key="drama.book_id"
          :drama="drama"
          :download-data="getDownloadDataForDrama(drama.series_name)"
          :is-syncing="syncingDramaId === drama.book_id"
          :is-processing="clipProcessingDramaId === drama.book_id"
          :is-any-syncing="isAnyOperationBlocked"
          :is-submitted-for-download="submittedForDownloadSet.has(drama.book_id)"
          :is-submitted-for-clip="submittedForClipSet.has(drama.book_id)"
          @show-image="showDramaImage"
          @copy-name="copyDramaName"
          @sync-to-feishu="syncToFeishu"
        />
      </div>
      <div v-else-if="isSearching && searchLoading" class="empty-state">
        <Icon icon="mdi:loading" class="empty-icon animate-spin" />
        <h3 class="empty-title">搜索中...</h3>
        <p class="empty-description">正在匹配短剧，请稍候</p>
      </div>
      <div v-else-if="isSearching && !searchLoading" class="empty-state">
        <Icon icon="mdi:magnify" class="empty-icon" />
        <h3 class="empty-title">未找到相关短剧</h3>
        <p class="empty-description">请尝试其他关键词或清空搜索</p>
      </div>

      <!-- 搜索态的全局提示 Toast -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-2 opacity-0"
      >
        <div v-if="isSearching && showCopyToast" class="toast">
          <Icon icon="mdi:check-circle" class="toast-icon" />
          <span class="toast-message">{{ copyToastMessage }}</span>
        </div>
      </Transition>

      <!-- 飞书清单内容：组件始终挂载，搜索时仅隐藏，避免重复拉取 -->
      <div v-if="activeTab === 'feishu'" class="feishu-content" v-show="!isSearching">
        <DramaStatusBoard ref="dramaStatusBoardRef" />
      </div>

      <!-- 其他tab内容 -->
      <div v-else-if="!isSearching" class="new-drama-preview">
        <!-- 骨架屏加载状态 -->
        <div
          v-if="loading || listSkeletonLoading || searchLoading || rankingLoading"
          class="drama-list-skeleton"
        >
          <div class="skeleton-drama-list">
            <div v-for="n in 8" :key="n" class="skeleton-drama-card">
              <!-- 左侧封面骨架 -->
              <div class="skeleton-poster"></div>

              <!-- 中间信息区域骨架 -->
              <div class="skeleton-drama-info">
                <div class="skeleton-drama-main">
                  <div class="skeleton-drama-details">
                    <!-- 分类标签 -->
                    <div class="skeleton-category-tags">
                      <div class="skeleton-tag"></div>
                      <div class="skeleton-tag"></div>
                      <div class="skeleton-tag"></div>
                      <div class="skeleton-tag"></div>
                    </div>

                    <!-- 剧集信息 -->
                    <div class="skeleton-episode-info">
                      <div class="skeleton-episode-item"></div>
                    </div>

                    <!-- 首发时间 -->
                    <div class="skeleton-publish-time">
                      <div class="skeleton-time-text"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右侧状态和操作区域骨架 -->
              <div class="skeleton-drama-actions">
                <div class="skeleton-status-label"></div>
                <div class="skeleton-drama-id"></div>
                <div class="skeleton-action-button"></div>
              </div>
            </div>
          </div>
          <div class="skeleton-loading-indicator">
            <div class="skeleton-spinner"></div>
            <span class="skeleton-loading-text">
              {{
                activeTab === 'ranking'
                  ? '正在加载榜单剧数据...'
                  : (activeTab as string) === 'feishu'
                    ? '正在加载飞书清单数据...'
                    : '正在加载新剧数据...'
              }}
            </span>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-section">
          <Icon icon="mdi:alert-circle" class="error-icon" />
          <p class="error-message">{{ error }}</p>
          <button @click="fetchDramaList" class="retry-button">
            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
            重试
          </button>
        </div>

        <!-- 新剧抢跑列表 - 仅在没有搜索时显示 -->
        <div
          v-else-if="
            !isSearching &&
            !listSkeletonLoading &&
            paginatedDramas.length > 0 &&
            activeTab === 'new-drama'
          "
          class="drama-list"
        >
          <DramaCard
            v-for="drama in paginatedDramas"
            :key="drama.book_id"
            :drama="drama"
            :download-data="getDownloadDataForDrama(drama.series_name)"
            :is-syncing="syncingDramaId === drama.book_id"
            :is-processing="clipProcessingDramaId === drama.book_id"
            :is-any-syncing="isAnyOperationBlocked"
            :is-submitted-for-download="submittedForDownloadSet.has(drama.book_id)"
            :is-submitted-for-clip="submittedForClipSet.has(drama.book_id)"
            @show-image="showDramaImage"
            @copy-name="copyDramaName"
            @sync-to-feishu="syncToFeishu"
          />
        </div>

        <!-- 榜单剧列表 - 仅在没有搜索时显示 -->
        <div
          v-else-if="
            !isSearching && !rankingLoading && rankingList.length > 0 && activeTab === 'ranking'
          "
          class="drama-list"
        >
          <DramaCard
            v-for="(drama, index) in rankingList"
            :key="drama.book_id"
            :drama="drama as any"
            :download-data="getRankingDownloadDataForDrama(drama.book_name)"
            :is-syncing="syncingDramaId === drama.book_id"
            :is-processing="clipProcessingDramaId === drama.book_id"
            :is-any-syncing="isAnyOperationBlocked"
            :is-submitted-for-download="submittedForDownloadSet.has(drama.book_id)"
            :is-submitted-for-clip="submittedForClipSet.has(drama.book_id)"
            :ranking="rankingPageIndex * rankingPageSize + index + 1"
            :show-ranking="true"
            @show-image="showDramaImage"
            @copy-name="copyDramaName"
            @sync-to-feishu="syncToFeishu"
          />
        </div>

        <!-- 榜单剧分页器 -->
        <div
          v-if="
            !isSearching &&
            !rankingLoading &&
            rankingList.length > 0 &&
            activeTab === 'ranking' &&
            rankingTotal > rankingPageSize
          "
          class="pagination-container"
        >
          <div class="pagination">
            <button
              @click="goToRankingPage(rankingPageIndex)"
              :disabled="rankingPageIndex <= 0"
              class="pagination-btn prev-btn"
            >
              <Icon icon="mdi:chevron-left" class="btn-icon" />
              <span>上一页</span>
            </button>

            <div class="pagination-pages">
              <button
                v-for="page in rankingVisiblePages"
                :key="page"
                @click="typeof page === 'number' ? goToRankingPage(page - 1) : null"
                :class="['page-btn', page === rankingPageIndex + 1 ? 'active' : '']"
                :disabled="typeof page === 'string'"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="goToRankingPage(rankingPageIndex + 2)"
              :disabled="rankingPageIndex >= Math.ceil(rankingTotal / rankingPageSize) - 1"
              class="pagination-btn next-btn"
            >
              <span>下一页</span>
              <Icon icon="mdi:chevron-right" class="btn-icon" />
            </button>
          </div>

          <div class="pagination-info">
            <span class="page-info">
              第 {{ rankingPageIndex + 1 }} 页，共
              {{ Math.ceil(rankingTotal / rankingPageSize) }} 页
            </span>
            <span class="total-info"> 共 {{ rankingTotal }} 条记录 </span>
          </div>
        </div>

        <!-- 搜索结果分页器 -->
        <div
          v-if="
            isSearching &&
            !searchLoading &&
            searchResults.length > 0 &&
            searchTotal > searchPageSize
          "
          class="pagination-container"
        >
          <div class="pagination">
            <button
              @click="goToSearchPage(searchCurrentPage - 1)"
              :disabled="searchCurrentPage <= 1"
              class="pagination-btn prev-btn"
            >
              <Icon icon="mdi:chevron-left" class="btn-icon" />
              <span>上一页</span>
            </button>
            <div class="pagination-info">
              <span
                >第 {{ searchCurrentPage }} 页，共
                {{ Math.ceil(searchTotal / searchPageSize) }} 页</span
              >
            </div>
            <button
              @click="goToSearchPage(searchCurrentPage + 1)"
              :disabled="searchCurrentPage >= Math.ceil(searchTotal / searchPageSize)"
              class="pagination-btn next-btn"
            >
              <span>下一页</span>
              <Icon icon="mdi:chevron-right" class="btn-icon" />
            </button>
          </div>
        </div>

        <!-- 普通分页器 - 仅在没有搜索且不是榜单剧标签页时显示 -->
        <div
          v-else-if="
            !isSearching &&
            !listSkeletonLoading &&
            paginatedDramas.length > 0 &&
            activeTab !== 'ranking' &&
            (activeTab !== 'new-drama' || selectedDate === 'all')
          "
          class="pagination-container"
        >
          <div class="pagination">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="pagination-btn prev-btn"
            >
              <Icon icon="mdi:chevron-left" class="btn-icon" />
              <span>上一页</span>
            </button>

            <div class="pagination-pages">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="['page-btn', page === currentPage ? 'active' : '']"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="pagination-btn next-btn"
            >
              <span>下一页</span>
              <Icon icon="mdi:chevron-right" class="btn-icon" />
            </button>
          </div>

          <div class="pagination-info">
            <span class="page-info"> 第 {{ currentPage }} 页，共 {{ totalPages }} 页 </span>
            <span class="total-info"> 共 {{ filteredDramas.length }} 条记录 </span>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="
            !listSkeletonLoading &&
            !rankingLoading &&
            filteredDramas.length === 0 &&
            rankingList.length === 0
          "
          class="empty-state"
        >
          <Icon
            :icon="
              isSearching
                ? 'mdi:magnify'
                : activeTab === 'ranking'
                  ? 'mdi:trophy'
                  : 'mdi:calendar-clock'
            "
            class="empty-icon"
          />
          <h3 class="empty-title">
            {{
              isSearching
                ? '未找到相关短剧'
                : activeTab === 'ranking'
                  ? '暂无榜单剧数据'
                  : selectedDateLabel + '暂无新剧'
            }}
          </h3>
          <p class="empty-description">
            {{
              isSearching
                ? '请尝试其他关键词或清空搜索'
                : activeTab === 'ranking'
                  ? '榜单剧数据正在加载中，请稍后再来查看'
                  : '请关注其他日期或稍后再来查看'
            }}
          </p>
        </div>

        <!-- 复制成功提示 Toast -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform translate-y-2 opacity-0"
        >
          <div v-if="showCopyToast" class="toast">
            <Icon icon="mdi:check-circle" class="toast-icon" />
            <span class="toast-message">{{ copyToastMessage }}</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 剧集大图弹窗（需要在搜索态也可用，放到最外层） -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
        <div class="image-modal" @click.stop>
          <div class="image-modal-header">
            <h3 class="image-modal-title">
              {{ currentDramaImage?.series_name || '剧集大图' }}
            </h3>
            <button @click="closeImageModal" class="image-modal-close">
              <Icon icon="mdi:close" class="close-icon" />
            </button>
          </div>
          <div class="image-modal-content">
            <div class="image-container">
              <!-- 骨架屏加载效果 -->
              <div v-if="imageLoading" class="image-skeleton">
                <div class="skeleton-image-large"></div>
                <div class="skeleton-loading-text">正在加载大图...</div>
              </div>

              <!-- 错误状态 -->
              <div v-else-if="imageError" class="image-error">
                <Icon icon="mdi:alert-circle" class="error-icon" />
                <span>{{ imageError }}</span>
              </div>

              <!-- 图片显示 -->
              <div v-else-if="currentDramaImage?.original_thumb_url" class="image-display">
                <img
                  :src="currentDramaImage.original_thumb_url"
                  :alt="currentDramaImage.series_name"
                  class="image-large image-fade-in"
                  @click="closeImageModal"
                  @error="handleImageError"
                />
              </div>

              <!-- 空状态 -->
              <div v-else class="image-empty">
                <Icon icon="mdi:image-off" class="empty-icon" />
                <span>暂无大图信息</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 日期选择器弹窗 -->
    <DatePicker
      v-model:show="showDatePicker"
      :drama-name="getDramaName(currentClipDrama)"
      :loading="clipProcessingDramaId !== null"
      @confirm="handleDateConfirm"
      @cancel="handleDateCancel"
    />

    <!-- 自动提交下载时间选择弹窗 -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="showAutoSubmitModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click="showAutoSubmitModal = false"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          @click.stop
        >
          <!-- 弹窗标题 -->
          <div
            class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div
                  class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
                >
                  <Icon icon="mdi:robot-outline" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">自动提交下载</h3>
                  <p class="text-xs text-gray-500">选择轮询间隔时间</p>
                </div>
              </div>
              <button
                @click="showAutoSubmitModal = false"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon icon="mdi:close" class="w-6 h-6" />
              </button>
            </div>
          </div>

          <!-- 弹窗内容 -->
          <div class="px-6 py-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2"> 轮询间隔时间 </label>
              <NSelect
                v-model:value="autoSubmitInterval"
                :options="autoSubmitIntervalOptions"
                placeholder="请选择轮询间隔时间"
                size="large"
              />
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div class="flex items-start space-x-2">
                <Icon icon="mdi:information" class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div class="text-sm text-blue-800">
                  <p class="font-medium mb-1">功能说明：</p>
                  <ul class="list-disc list-inside space-y-1 text-xs">
                    <li>自动扫描今天/明天/后天的剧集</li>
                    <li>处理所有符合条件的剧集</li>
                    <li>只处理"新增待下载"的剧集</li>
                    <li>按日期顺序依次执行</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- 弹窗操作按钮 -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              @click="showAutoSubmitModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              @click="startAutoSubmit"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              开始自动提交
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NInput, NSelect, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useApiConfigStore } from '@/stores/apiConfig'
import { useDramaSubjectStore } from '@/stores/dramaSubject'
import { useDouyinMaterialStore } from '@/stores/douyinMaterial'
import { getNewDramaList, searchNewDramaList, getDownloadTaskList, feishuApi } from '@/api'
import {
  startAutoSubmit as startAutoSubmitApi,
  stopAutoSubmit as stopAutoSubmitApi,
  getAutoSubmitStatus,
} from '@/api/autoSubmit'
import http from '@/api/http'
import type { NewDramaItem, DownloadTask } from '@/api/types'
import dayjs from 'dayjs'
import DatePicker from './DatePicker.vue'
import DramaCard from './DramaCard.vue'
import DramaStatusBoard from './DramaStatusBoard.vue'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 配置dayjs插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 路由实例
const router = useRouter()

// 账号store实例
const accountStore = useAccountStore()
const apiConfigStore = useApiConfigStore()
const dramaSubjectStore = useDramaSubjectStore()
const douyinMaterialStore = useDouyinMaterialStore()

// 格式化抖音号素材配置
function formatDouyinMaterialConfig(): string {
  const matches = douyinMaterialStore.matches

  if (!matches || matches.length === 0) {
    return ''
  }

  return matches
    .filter(match => match.douyinAccount && match.douyinAccountId && match.materialRange)
    .map(match => `${match.douyinAccount} ${match.douyinAccountId} ${match.materialRange}`)
    .join('\n')
}

// 使用 Naive UI 的 message API
const message = useMessage()

// 组件引用
const dramaStatusBoardRef = ref<InstanceType<typeof DramaStatusBoard> | null>(null)

// 响应式数据
const loading = ref(false)
const error = ref('')
const dramaList = ref<NewDramaItem[]>([])
const downloadList = ref<DownloadTask[]>([])
const listSkeletonLoading = ref(false)
const selectedDate = ref('today')
const showCopyToast = ref(false)
const copyToastMessage = ref('')
const syncingDramaId = ref<string | null>(null)
const isAnyDramaSyncing = ref(false)

// 记录已提交的剧集（仅当前会话有效）
const submittedForDownloadSet = ref<Set<string>>(new Set())
const submittedForClipSet = ref<Set<string>>(new Set())

// 模板版移除增剧对比逻辑

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  stopStatusPolling() // 清理服务端状态轮询
})

// 新增：Tab 切换
const activeTab = ref<'new-drama' | 'ranking' | 'feishu'>('new-drama')

const canUpload = computed(() => dramaStatusBoardRef.value?.canUpload ?? false)

// 并发控制：当自动提交运行时，禁用手动操作
const isAnyOperationBlocked = computed(() => {
  return (
    (currentSubjectStatus.value.running && isAutoSubmitForCurrentSubject.value) ||
    isAnyDramaSyncing.value
  )
})

function handleOpenUpload() {
  dramaStatusBoardRef.value?.openUploadModal?.()
}

// 新增：排行榜相关数据
// 排行榜数据类型定义
interface RankingDramaItem {
  book_id: string
  book_name: string
  series_name?: string
  category?: string
  category_text?: string
  category_tags?: string[]
  original_thumb_url: string
  episode_amount?: number
  publish_time?: string
  feishu_downloaded?: boolean
  feishu_exists?: boolean
  [key: string]: unknown
}

const rankingList = ref<RankingDramaItem[]>([])
const rankingLoading = ref(false)
const rankingError = ref('')
const rankingDownloadList = ref<DownloadTask[]>([])

// 榜单剧分页相关状态
const rankingPageIndex = ref(0)
const rankingPageSize = ref(10)
const rankingTotal = ref(0)

// 新增待剪辑相关状态
const showDatePicker = ref(false)
const currentClipDrama = ref<NewDramaItem | null>(null)
const clipProcessingDramaId = ref<string | null>(null)

// 搜索和分页相关
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10) // 每页显示10条记录

// 搜索相关状态
const searchResults = ref<NewDramaItem[]>([])
const searchLoading = ref(false)
const searchTotal = ref(0)
const searchCurrentPage = ref(1)
const searchPageSize = ref(10)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

// 自动提交下载相关状态
const autoSubmitStatus = ref<Record<string, any>>({})
const autoSubmitTimer = ref<number | null>(null) // 定时器ID
const autoSubmitCountdownTimer = ref<number | null>(null) // 倒计时定时器ID
const autoSubmitInterval = ref(5) // 轮询间隔（分钟）
const autoSubmitCountdown = ref(0) // 倒计时（秒）
const showAutoSubmitModal = ref(false) // 是否显示时间选择弹窗
// 当前主体的状态
const currentSubjectStatus = computed(() => {
  const subject = dramaSubjectStore.currentSubject
  return (
    autoSubmitStatus.value[subject] || {
      enabled: false,
      running: false,
      intervalMinutes: 5,
      nextRunTime: null,
      lastRunTime: null,
      stats: { totalProcessed: 0, successCount: 0, failCount: 0, skipCount: 0 },
      progress: { current: 0, total: 0, currentDate: '', currentDrama: '' },
      taskHistory: [],
    }
  )
})

// 判断当前主体是否启用了自动提交
const isAutoSubmitForCurrentSubject = computed(() => {
  return currentSubjectStatus.value.enabled
})

function normalizeAutoSubmitStatus(rawStatus: unknown): Record<string, any> {
  if (!rawStatus || typeof rawStatus !== 'object') {
    return {}
  }

  const statusObj = rawStatus as Record<string, any>

  // 兼容旧接口：直接返回单个状态对象
  if ('enabled' in statusObj && 'running' in statusObj && 'stats' in statusObj) {
    return {
      每日: statusObj,
      daily: statusObj,
      默认: statusObj,
    }
  }

  // 兼容新旧主体键
  if (statusObj.daily && !statusObj['每日']) {
    statusObj['每日'] = statusObj.daily
  }
  if (statusObj['每日'] && !statusObj.daily) {
    statusObj.daily = statusObj['每日']
  }
  if (statusObj.daily && !statusObj['默认']) {
    statusObj['默认'] = statusObj.daily
  }

  return statusObj
}

// 图片弹窗相关状态
const showImageModal = ref(false)
const imageLoading = ref(false)
const imageError = ref('')
const currentDramaImage = ref<NewDramaItem | null>(null)

// 动态计算日期选项（每次访问时都获取最新的日期，使用北京时间）
const dateOptions = computed(() => {
  // 每次调用时重新计算当前日期
  const today = dayjs().tz('Asia/Shanghai')
  const tomorrow = today.add(1, 'day')
  const dayAfterTomorrow = today.add(2, 'day')

  return [
    {
      value: 'today',
      label: '今天',
      date: formatDate(today),
    },
    {
      value: 'tomorrow',
      label: '明天',
      date: formatDate(tomorrow),
    },
    {
      value: 'day-after-tomorrow',
      label: '后天',
      date: formatDate(dayAfterTomorrow),
    },
  ]
})

// 自动提交下载轮询时间选项
const autoSubmitIntervalOptions = [
  { label: '5 分钟', value: 5 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
  { label: '1.5 小时', value: 90 },
  { label: '2 小时', value: 120 },
  { label: '4 小时', value: 240 },
  { label: '6 小时', value: 360 },
  { label: '8 小时', value: 480 },
  { label: '10 小时', value: 600 },
  { label: '12 小时', value: 720 },
]

// 计算属性
const selectedDateLabel = computed(() => {
  const option = dateOptions.value.find(opt => opt.value === selectedDate.value)
  return option?.label || '今天'
})

const currentDateDramas = computed(() => {
  const option = dateOptions.value.find(opt => opt.value === selectedDate.value)
  if (!option) return []

  // 具体日期：今天、明天、后天
  const filteredDramas = dramaList.value.filter(drama => {
    const publishDate = drama.publish_time.split(' ')[0]
    return publishDate === option.date
  })

  // 按首发时间排序，越早的排在越前面（使用北京时间）
  return filteredDramas.sort((a, b) => {
    const timeA = dayjs.tz(a.publish_time, 'Asia/Shanghai').valueOf()
    const timeB = dayjs.tz(b.publish_time, 'Asia/Shanghai').valueOf()
    return timeA - timeB
  })
})

// 是否正在搜索
const isSearching = computed(() => searchKeyword.value.trim().length > 0)

// 过滤后的短剧列表（包含搜索过滤）
const filteredDramas = computed(() => {
  // 如果有搜索关键词，返回搜索结果
  if (isSearching.value) {
    return searchResults.value
  }

  // 没有搜索关键词时，返回当前日期tab下的短剧
  const dramas = currentDateDramas.value

  // 判断是否可以新增待下载
  const canAddDownload = (drama: NewDramaItem) => !drama.feishu_downloaded && !drama.feishu_exists

  // 判断下载状态是否为完成
  const isDownloadCompleted = (drama: NewDramaItem) => {
    const downloadData = getDownloadDataForDrama(drama.series_name)
    return downloadData?.task_status === 2
  }

  // 模板版不启用增剧逻辑，仅保留普通排序
  const dramasWithAddAndCompleted = dramas.filter(d => canAddDownload(d) && isDownloadCompleted(d))
  const dramasWithAddButNotCompleted = dramas.filter(
    d => canAddDownload(d) && !isDownloadCompleted(d)
  )
  const dramasWithoutAddButton = dramas.filter(d => !canAddDownload(d))

  return [...dramasWithAddAndCompleted, ...dramasWithAddButNotCompleted, ...dramasWithoutAddButton]
})

// 分页后的短剧列表
const paginatedDramas = computed(() => {
  // 如果正在搜索，使用搜索结果
  if (isSearching.value) {
    return searchResults.value
  }

  // 分日tab下不分页，显示所有短剧
  if (activeTab.value === 'new-drama' && selectedDate.value !== 'all') {
    return filteredDramas.value
  }

  // 正常分页逻辑（全部tab）
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredDramas.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  // 如果正在搜索，使用搜索总页数
  if (isSearching.value) {
    return Math.ceil(searchTotal.value / searchPageSize.value)
  }

  return Math.ceil(filteredDramas.value.length / pageSize.value)
})

// 可见的页码
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    // 如果总页数不超过7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 如果总页数超过7页，显示省略号
    if (current <= 4) {
      // 当前页在前4页
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后4页
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// 工具函数
function formatDate(date: dayjs.Dayjs): string {
  // 使用北京时间
  return date.format('YYYY-MM-DD')
}

// 获取当前日期范围（实时计算，使用北京时间）
function getCurrentDateRange(): string[] {
  const today = dayjs().tz('Asia/Shanghai')
  const tomorrow = today.add(1, 'day')
  const dayAfterTomorrow = today.add(2, 'day')

  return [
    today.format('YYYY-MM-DD'), // 今天
    tomorrow.format('YYYY-MM-DD'), // 明天
    dayAfterTomorrow.format('YYYY-MM-DD'), // 后天
  ]
}

function getDateDramaCount(dateValue: string): number {
  // 使用动态计算的日期选项
  const option = dateOptions.value.find(opt => opt.value === dateValue)
  if (!option) return 0

  // 具体日期：今天、明天、后天
  return dramaList.value.filter(drama => {
    const publishDate = drama.publish_time.split(' ')[0]
    return publishDate === option.date
  }).length
}

function getDateIcon(dateValue: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]

  if (dateValue === 'today' || dateValue === todayStr) return 'mdi:calendar-today'
  if (dateValue === 'tomorrow' || dateValue === tomorrowStr) return 'mdi:calendar-clock'
  if (dateValue === 'day-after-tomorrow' || dateValue === dayAfterTomorrowStr)
    return 'mdi:calendar-plus'
  return 'mdi:calendar'
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.src = '/placeholder-cover.svg' // 设置默认封面
}

// 显示成功提示
function showSuccessToast(message: string, duration = 3000) {
  copyToastMessage.value = message
  showCopyToast.value = true

  // 3秒后自动隐藏提示
  setTimeout(() => {
    showCopyToast.value = false
  }, duration)
}

// 复制剧名功能
async function copyDramaName(dramaName: string) {
  try {
    await navigator.clipboard.writeText(dramaName)
    showSuccessToast(`已复制剧名: ${dramaName}`)
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea')
    textArea.value = dramaName
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showSuccessToast(`已复制剧名: ${dramaName}`)
    } catch (fallbackErr) {
      console.error('降级复制也失败:', fallbackErr)
      showSuccessToast('复制失败，请手动复制')
    }
    document.body.removeChild(textArea)
  }
}

// 查看剧集大图功能（直接使用短剧列表返回的 original_thumb_url）
function showDramaImage(drama: NewDramaItem) {
  showImageModal.value = true
  imageLoading.value = true
  imageError.value = ''
  currentDramaImage.value = null

  if (drama.original_thumb_url) {
    // 预加载图片，确保图片加载完成后再显示
    const img = new Image()
    img.onload = () => {
      currentDramaImage.value = drama
      imageLoading.value = false
    }
    img.onerror = () => {
      imageError.value = '图片加载失败'
      imageLoading.value = false
    }
    img.src = drama.original_thumb_url
  } else {
    imageError.value = '暂无大图信息'
    imageLoading.value = false
  }
}

// 关闭图片弹窗
function closeImageModal() {
  showImageModal.value = false
  currentDramaImage.value = null
  imageError.value = ''
}

// 同步到飞书功能
// 防止重复调用的锁
const syncingDramaSet = new Set<string>()

async function syncToFeishu(payload: { drama: NewDramaItem | RankingDramaItem }) {
  const { drama } = payload

  // 防止重复调用：使用剧集ID作为锁
  const dramaId = drama.book_id
  if (syncingDramaSet.has(dramaId)) {
    console.log('该剧集正在同步中，跳过重复调用')
    return
  }

  syncingDramaSet.add(dramaId)

  try {
    if (drama.feishu_downloaded) {
      await handleAddClip(drama)
      return
    }

    await handleAddDownload(drama)
  } finally {
    // 清除锁
    syncingDramaSet.delete(dramaId)
  }
}

// 获取剧集名称的辅助函数
function getDramaName(drama: NewDramaItem | RankingDramaItem | null): string {
  if (!drama) return ''

  // 如果是排行榜数据，使用book_name字段
  if ('book_name' in drama && drama.book_name) {
    return drama.book_name
  }

  // 如果是新剧数据，使用series_name字段
  if ('series_name' in drama && drama.series_name) {
    return drama.series_name
  }

  return ''
}

// 处理新增待剪辑流程
async function handleAddClip(drama: NewDramaItem | RankingDramaItem) {
  // 设置当前剪辑的剧集
  currentClipDrama.value = drama as NewDramaItem
  showDatePicker.value = true
}

// 处理日期选择确认
async function handleDateConfirm(selectedDate: string) {
  if (!currentClipDrama.value || !selectedDate) {
    return
  }

  try {
    // 设置处理状态
    clipProcessingDramaId.value = currentClipDrama.value.book_id

    // 将选择的日期转换为时间戳
    const date = new Date(selectedDate)
    const timestamp = date.getTime()

    // 获取剧名，兼容排行榜和新剧列表数据
    const dramaName =
      (currentClipDrama.value as any).book_name || (currentClipDrama.value as any).series_name

    // 查询剧集状态表，检查该日期是否已存在该剧集
    const searchResult = await feishuApi.searchDramaStatusRecord(dramaName, timestamp)

    if (searchResult.data && searchResult.data.total > 0) {
      // 已存在记录，提示并中断流程
      showSuccessToast(`剧集"${dramaName}"在${selectedDate}已有记录，无需重复添加`)
    } else {
      // 不存在记录，直接检查账户并创建剪辑记录
      try {
        // 检查是否有可用的账户
        const hasAvailableAccount = await feishuApi.checkAvailableHuyuAccounts()
        if (!hasAvailableAccount) {
          showSuccessToast('无可用账户，请及时联系管理员添加并完成录户')
          return // 中断后续流程
        }

        // 确定主体字段
        const subjectValue = dramaSubjectStore.subjectFieldValue

        // 获取可用账户
        const availableAccount = await feishuApi.getAvailableHuyuAccount()

        if (!availableAccount) {
          showSuccessToast('暂无可用的账户，请及时联系管理员添加并完成录户')
          return
        }

        const finalAccountId = availableAccount.account
        const finalRecordId = availableAccount.recordId

        if (finalAccountId && finalRecordId) {
          // 格式化抖音号素材配置
          const douyinMaterial = formatDouyinMaterialConfig()

          // 状态统一为"待剪辑"
          const clipStatus = '待剪辑'

          // 创建剪辑记录，包含剧名、上架时间、账户和主体
          await feishuApi.createClipRecord(
            dramaName,
            timestamp,
            finalAccountId,
            currentClipDrama.value.publish_time || '',
            subjectValue,
            douyinMaterial || undefined, // 如果为空字符串则传 undefined
            clipStatus
          )

          // 更新账户的"是否已用"状态为"是"
          await feishuApi.updateHuyuAccountUsedStatus(finalRecordId)

          showSuccessToast(
            `剧集"${dramaName}"已成功添加到${selectedDate}的剪辑计划中，分配账户：${finalAccountId}`
          )

          // 标记为已提交待剪辑
          if (currentClipDrama.value) {
            submittedForClipSet.value.add(currentClipDrama.value.book_id)
          }
        } else {
          // 没有可用账户，终止流程
          showSuccessToast('暂无可用的账户，请及时联系管理员添加并完成录户')
          return
        }
      } catch (accountError) {
        console.error('分配账户失败:', accountError)
        // 分配账户失败，终止流程
        const errorMessage = accountError instanceof Error ? accountError.message : '未知错误'
        showSuccessToast(`分配账户失败：${errorMessage}`)
        return
      }
    }
  } catch (error) {
    console.error('处理剪辑记录失败:', error)
    const dramaName =
      (currentClipDrama.value as any)?.book_name || (currentClipDrama.value as any)?.series_name
    showSuccessToast(`处理剪辑记录失败：${dramaName}`)
  } finally {
    // 清理状态
    clipProcessingDramaId.value = null
    showDatePicker.value = false
    currentClipDrama.value = null
  }
}

// 取消日期选择
function handleDateCancel() {
  showDatePicker.value = false
  currentClipDrama.value = null
}

// ==================== 自动提交下载功能 ====================

// 状态轮询定时器
let statusPollingTimer: number | null = null

async function startAutoSubmit() {
  // 检查当前主体是否已在运行
  if (currentSubjectStatus.value.enabled) {
    message.warning('当前主体的自动提交已在运行中')
    return
  }

  showAutoSubmitModal.value = false

  try {
    console.log(`启动服务端自动提交下载，轮询间隔: ${autoSubmitInterval.value} 分钟`)

    const result = await startAutoSubmitApi({
      intervalMinutes: autoSubmitInterval.value,
      subject: dramaSubjectStore.currentSubject,
    })

    if (result.code === 0) {
      message.success('自动提交已启动（服务端运行）')
      // 开始轮询状态
      startStatusPolling()
    } else {
      message.error(result.message || '启动失败')
    }
  } catch (error) {
    console.error('启动自动提交失败:', error)
    message.error('启动自动提交失败')
  }
}

// 停止自动提交（调用服务端API）
async function stopAutoSubmit() {
  console.log('停止服务端自动提交下载')

  try {
    const result = await stopAutoSubmitApi(dramaSubjectStore.currentSubject)

    if (result.code === 0) {
      message.success('自动提交已停止')
      // 更新本地状态
      if (result.data) {
        autoSubmitStatus.value = normalizeAutoSubmitStatus(result.data)
      }
    } else {
      message.warning(result.message || '停止可能未成功')
    }
  } catch (error) {
    console.error('停止自动提交失败:', error)
  }

  // 无论成功失败，都清理本地状态
  autoSubmitCountdown.value = 0

  // 停止状态轮询
  stopStatusPolling()

  if (autoSubmitTimer.value) {
    clearTimeout(autoSubmitTimer.value)
    autoSubmitTimer.value = null
  }

  if (autoSubmitCountdownTimer.value) {
    clearInterval(autoSubmitCountdownTimer.value)
    autoSubmitCountdownTimer.value = null
  }
}

// 开始轮询服务端状态
function startStatusPolling() {
  stopStatusPolling() // 先清理
  fetchAutoSubmitStatusFromServer() // 立即获取一次
  statusPollingTimer = window.setInterval(fetchAutoSubmitStatusFromServer, 5000) // 每5秒轮询
}

// 停止轮询服务端状态
function stopStatusPolling() {
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer)
    statusPollingTimer = null
  }
}

// 从服务端获取状态并更新本地
async function fetchAutoSubmitStatusFromServer() {
  try {
    const result = await getAutoSubmitStatus()
    if (result.code === 0 && result.data) {
      // 更新所有主体的状态
      autoSubmitStatus.value = normalizeAutoSubmitStatus(result.data)

      // 计算当前主体的倒计时
      const currentStatus = currentSubjectStatus.value
      if (currentStatus.nextRunTime) {
        const nextTime = new Date(currentStatus.nextRunTime).getTime()
        const now = Date.now()
        autoSubmitCountdown.value = Math.max(0, Math.floor((nextTime - now) / 1000))
      } else {
        autoSubmitCountdown.value = 0
      }

      // 如果当前主体已停止，停止轮询
      if (!currentStatus.enabled) {
        stopStatusPolling()
      }
    }
  } catch (error) {
    console.error('获取自动提交状态失败:', error)
  }
}

// 格式化倒计时显示
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '即将开始...'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`
  } else {
    return `${secs}秒`
  }
}

// ==================== 自动提交下载功能结束 ====================

// 处理新增待下载流程
async function handleAddDownload(drama: NewDramaItem | RankingDramaItem) {
  // 获取剧名，兼容排行榜和新剧列表数据
  const dramaName = (drama as any).book_name || (drama as any).series_name

  // 防止重复调用：如果已经在同步中，直接返回
  if (syncingDramaId.value === drama.book_id && isAnyDramaSyncing.value) {
    console.log('该剧集正在同步中，跳过重复调用')
    return
  }

  try {
    // 设置同步状态
    syncingDramaId.value = drama.book_id
    isAnyDramaSyncing.value = true

    // 使用设置页配置的统一账户表
    const hasAvailableAccount = await feishuApi.checkAvailableHuyuAccounts()
    if (!hasAvailableAccount) {
      showSuccessToast('无可用账户，请及时联系管理员添加并完成录户')
      return // 中断后续流程
    }

    // 搜索剧集清单表，检查这部剧是否已存在
    const searchResult = await feishuApi.searchDramaList(dramaName)
    console.log('搜索结果:', searchResult)

    // 检查是否存在完全匹配的剧名
    if (searchResult.data && searchResult.data.total > 0) {
      const existingDrama = searchResult.data.items.find(item => {
        const itemDramaName = item.fields['剧名']?.[0]?.text
        return itemDramaName === dramaName
      })

      if (existingDrama) {
        // 剧集已存在，立即中断后续流程
        showSuccessToast(`剧集"${dramaName}"已在飞书剧集清单中，无需重复同步`)
        return // 中断后续流程
      }
    }

    // 剧集不存在或名称不完全匹配，继续创建新记录
    try {
      const createResult = await feishuApi.createDramaRecord(
        dramaName,
        '',
        drama.publish_time,
        dramaSubjectStore.isDailySubject ? drama.book_id : undefined
      )
      console.log('新增记录成功:', createResult)

      // 确定主体字段
      const subjectValue = dramaSubjectStore.subjectFieldValue

      // 获取可用账户
      const availableAccount = await feishuApi.getAvailableHuyuAccount()

      if (!availableAccount) {
        showSuccessToast(`暂无可用的账户，无法添加剧集"${dramaName}"`)
        console.log('暂无可用的账户，流程中断')
        return
      }

      const finalAccountId = availableAccount.account
      const finalRecordId = availableAccount.recordId

      if (!finalAccountId || !finalRecordId) {
        showSuccessToast(`暂无可用的账户，无法添加剧集"${dramaName}"`)
        console.log('暂无可用的账户，流程中断')
        return
      }

      // 创建剧集状态记录并分配账户和主体
      try {
        // 根据下载状态决定飞书状态：加密中(4)/压缩中(1)/完成(2)设为"待下载"，其他设为"待提交"
        const downloadData = getDownloadDataForDrama(dramaName)
        const taskStatus = downloadData?.task_status
        const readyStatuses = [1, 2, 4] // 压缩中、完成、加密中
        const feishuStatus =
          taskStatus !== undefined && readyStatuses.includes(taskStatus) ? '待下载' : '待提交'

        // 直接使用剧集的首发时间
        const targetPublishTime = drama.publish_time || ''

        // 格式化抖音号素材配置（达人和管理员都写入）
        const douyinMaterial = formatDouyinMaterialConfig()

        await feishuApi.createDramaStatusRecord(
          dramaName,
          targetPublishTime,
          finalAccountId,
          subjectValue, // 达人固定为"欣雅"
          feishuStatus,
          douyinMaterial || undefined // 如果为空字符串则传 undefined
        )
        console.log('剧集状态记录创建成功，已分配账户:', finalAccountId, '状态:', feishuStatus)

        // 更新账户的"是否已用"状态为"是"（达人会自动使用自己配置的表ID）
        await feishuApi.updateHuyuAccountUsedStatus(finalRecordId)

        // 如果是每日主体，更新巨量账户备注（账户字段即为巨量账户ID）
        if (dramaSubjectStore.isDailySubject && finalAccountId) {
          try {
            const remark = `小红-${dramaName}`
            const { editJiliangAccountRemark } = await import('@/api/jiliang')
            await editJiliangAccountRemark({
              account_id: finalAccountId,
              remark,
            })
            console.log('更新巨量账户备注成功:', finalAccountId, remark)
          } catch (jiliangError) {
            console.error('更新巨量账户备注失败:', jiliangError)
            // 不中断主流程，只记录错误
          }
        }

        showSuccessToast(
          `剧集"${dramaName}"已成功添加到飞书剧集清单，并分配账户：${finalAccountId}`,
          1000
        )
        console.log('账户分配成功:', finalAccountId)

        // 标记为已提交待下载
        submittedForDownloadSet.value.add(drama.book_id)
      } catch (accountError) {
        console.error('创建剧集状态记录或分配账户失败:', accountError)
        showSuccessToast(`创建剧集状态记录失败：${dramaName}`)
      }
    } catch (createError) {
      console.error('创建记录失败:', createError)
      showSuccessToast(`创建记录失败：${dramaName}`)
    }
  } catch (err) {
    console.error('同步飞书失败:', err)
    showSuccessToast(`同步飞书失败：${dramaName}`)
  } finally {
    // 清除同步状态
    syncingDramaId.value = null
    isAnyDramaSyncing.value = false
  }
}

// 下载数据过滤逻辑
function filterDownloadData(
  downloadData: DownloadTask[],
  dramaData: NewDramaItem[] | RankingDramaItem[]
): DownloadTask[] {
  // 1. 获取当前展示的剧集名称列表
  const dramaNames = dramaData
    .map(drama => {
      const name =
        'series_name' in drama && drama.series_name
          ? drama.series_name
          : (drama as RankingDramaItem).book_name
      // 清理剧名，去除前后空格
      return name?.trim() || ''
    })
    .filter(name => name) // 过滤掉空字符串

  // 2. 过滤出匹配的下载数据（包含所有task_status）

  const matchedData = downloadData.filter(item => {
    const downloadBookName = item.book_name?.trim() || ''
    // 只进行完全匹配，不进行任何处理
    const exactMatch = dramaNames.includes(downloadBookName)

    if (exactMatch) {
      console.log('匹配到下载数据:', downloadBookName, '状态:', item.task_status)
    }
    return exactMatch
  })

  // 3. 按剧名分组
  const groupedByBookName = matchedData.reduce(
    (acc, item) => {
      const bookName = item.book_name
      if (!acc[bookName]) {
        acc[bookName] = []
      }
      acc[bookName].push(item)
      return acc
    },
    {} as Record<string, DownloadTask[]>
  )

  // 4. 对每组进行优化选择：按状态优先级和task_name长度选择
  const deduplicatedData = Object.values(groupedByBookName).map((group: DownloadTask[]) => {
    // 4.1 按状态优先级排序：成功(2) > 压缩中(1) > 加密中(4) > 失败(3) > 其他(0)
    const statusPriority: Record<number, number> = { 2: 1, 1: 2, 4: 3, 3: 4, 0: 5 }

    // 4.2 先按状态优先级排序
    const sortedTasks = group.sort((a, b) => {
      const statusDiff = (statusPriority[a.task_status] || 5) - (statusPriority[b.task_status] || 5)
      if (statusDiff !== 0) {
        return statusDiff
      }
      // 状态相同时，只有成功状态(2)才按task_name长度排序（降序，选择最长的）
      if (a.task_status === 2 && b.task_status === 2) {
        return b.task_name.length - a.task_name.length
      }
      return 0
    })

    const selectedTask = sortedTasks[0]
    console.log('selectedTask', selectedTask)
    return selectedTask
  })

  return deduplicatedData
}

function mergeDownloadTasks(base: DownloadTask[], incoming: DownloadTask[]): DownloadTask[] {
  if (!incoming || incoming.length === 0) {
    return base
  }

  const map = new Map<string, DownloadTask>()

  base.forEach(task => {
    if (task.book_name) {
      map.set(task.book_name, task)
    }
  })

  incoming.forEach(task => {
    if (task.book_name) {
      map.set(task.book_name, task)
    }
  })

  return Array.from(map.values())
}

// 根据剧名获取对应的下载数据，兼容榜单列表的下载集合
function getDownloadDataForDrama(dramaName: string): DownloadTask | null {
  const name = dramaName?.trim()
  if (!name) return null

  const matchByName = (list: DownloadTask[]) =>
    list.find(item => item.book_name?.trim() === name) || null

  return matchByName(downloadList.value) || matchByName(rankingDownloadList.value)
}

// 根据排行榜剧名获取对应的下载数据
function getRankingDownloadDataForDrama(dramaName: string): DownloadTask | null {
  const result = rankingDownloadList.value.find(item => item.book_name === dramaName) || null
  return result
}

// API 请求函数
async function fetchDramaList() {
  loading.value = true
  listSkeletonLoading.value = true
  error.value = ''

  try {
    // 计算时间范围（过去30天到未来30天，使用北京时间）
    const now = dayjs().tz('Asia/Shanghai')
    const startTime = Math.floor(now.subtract(30, 'day').valueOf() / 1000)
    const endTime = Math.floor(now.add(30, 'day').valueOf() / 1000)

    // 并发请求：新剧列表（使用常读开放平台 API，每页最多100条）+ 下载任务列表
    const [dramaResult1, dramaResult2, dramaResult3, downloadResult] = await Promise.all([
      // 第一页：获取前100条
      getNewDramaList({
        page_size: 100,
        permission_statuses: '3,4',
        page_index: 0,
      }),
      // 第二页：获取接下来的100条
      getNewDramaList({
        page_size: 100,
        permission_statuses: '3,4',
        page_index: 1,
      }),
      // 第三页：获取接下来的100条
      getNewDramaList({
        page_size: 100,
        permission_statuses: '3,4',
        page_index: 2,
      }),
      // 下载任务列表（获取所有状态）
      getDownloadTaskList({
        start_time: startTime,
        end_time: endTime,
        page_index: 0,
        page_size: 20000,
      }),
    ])

    // 合并三次新剧列表的结果
    const allDramaData = [
      ...(dramaResult1.data?.data || []),
      ...(dramaResult2.data?.data || []),
      ...(dramaResult3.data?.data || []),
    ]

    // 根据 book_id 去重（防止重复数据）
    const uniqueDramaData = allDramaData.reduce(
      (acc, drama) => {
        if (!acc.find(item => item.book_id === drama.book_id)) {
          acc.push(drama)
        }
        return acc
      },
      [] as typeof allDramaData
    )

    // 创建模拟的 dramaResult 对象保持后续代码兼容
    const dramaResult = {
      data: {
        data: uniqueDramaData,
      },
    }

    // 过滤新剧数据：只要dy_audit_status为3（审核通过）且在指定日期范围内的数据
    // 每次刷新时重新计算当前日期范围
    const currentDateRange = getCurrentDateRange()

    const filteredDramaData = dramaResult.data.data.filter(drama => {
      // 检查审核状态
      if (drama.dy_audit_status !== 3) return false

      // 检查发布日期是否在日期范围内（今天、明天、后天）
      const publishDate = drama.publish_time.split(' ')[0]
      const isInRange = currentDateRange.includes(publishDate)

      // 过滤掉集数少于 40 集的短剧
      if (drama.episode_amount && drama.episode_amount < 40) return false

      return isInRange
    })

    dramaList.value = filteredDramaData

    // 处理下载数据
    if (downloadResult.data && Array.isArray(downloadResult.data)) {
      downloadList.value = filterDownloadData(downloadResult.data, filteredDramaData)
    } else {
      downloadList.value = []
    }
    console.log('downloadList.value', downloadList.value)

    // 刷新后检查当前页面是否还有数据，如果没有则重置到第一页
    const totalPages = Math.ceil(filteredDramaData.length / pageSize.value)
    if (currentPage.value > totalPages && totalPages > 0) {
      currentPage.value = 1
    }
  } catch (err) {
    console.error('Failed to fetch data:', err)
    error.value = err instanceof Error ? err.message : '获取数据失败'
  } finally {
    loading.value = false
    setTimeout(() => {
      listSkeletonLoading.value = false
    }, 800)
  }
}

// 监听选中日期变化
watch(selectedDate, async () => {
  // 切换日期时重置到第一页
  currentPage.value = 1
})

// 监听搜索关键词变化
watch(searchKeyword, () => {
  // 搜索时重置到第一页
  currentPage.value = 1
})

// 监听 Tab 切换
watch(activeTab, async newTab => {
  // 如果正在搜索，不执行任何操作，保持搜索结果
  if (isSearching.value) {
    return
  }

  // 根据切换到的 tab 加载对应数据
  if (newTab === 'feishu') {
    // 飞书清单 tab：DramaStatusBoard 组件会自动加载数据
    // 不需要额外操作
  } else if (newTab === 'new-drama') {
    // 新剧抢跑 tab：如果没有数据则加载
    if (dramaList.value.length === 0) {
      await fetchDramaList()
    }
  } else if (newTab === 'ranking') {
    // 榜单剧 tab：如果没有数据则加载
    if (rankingList.value.length === 0) {
      fetchRankingList()
    }
  }
})

// 监听主体切换，在不同主体之间切换时刷新数据
watch(
  () => dramaSubjectStore.currentSubject,
  (_newSubject, oldSubject) => {
    // 只有在初始化之后才触发刷新（避免首次加载时触发）
    if (oldSubject === undefined) {
      return
    }
    setTimeout(() => {
      handleRefresh()
    }, 100)
  }
)

// 返回首页
function goBack() {
  router.push('/')
}

// 智能刷新处理
async function handleRefresh() {
  if (searchKeyword.value.trim()) {
    // 有关键词时，执行搜索逻辑
    handleSearch()
  } else {
    // 没有关键词时，根据当前标签页执行对应的刷新逻辑
    if (activeTab.value === 'new-drama') {
      // 新剧抢跑标签页：刷新新剧数据
      fetchDramaList()
    } else if (activeTab.value === 'ranking') {
      // 排行榜标签页：刷新排行榜数据
      fetchRankingList()
    } else if (activeTab.value === 'feishu') {
      // 飞书清单标签页：刷新飞书清单数据
      if (dramaStatusBoardRef.value) {
        dramaStatusBoardRef.value.refreshData()
      }
    }
  }
}

// 搜索处理（防抖触发）
function handleSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    handleSearch()
  }, 400)
}

async function handleSearch() {
  const keyword = searchKeyword.value.trim()

  // 如果搜索框被清空，清空搜索结果
  if (!keyword) {
    searchResults.value = []
    searchTotal.value = 0
    searchCurrentPage.value = 1
    currentPage.value = 1

    // 如果是飞书清单 tab，清空表格搜索
    if (activeTab.value === 'feishu' && dramaStatusBoardRef.value) {
      dramaStatusBoardRef.value.clearSearch()
    }
    return
  }

  // 飞书清单 tab 也走统一的远程搜索展示逻辑，同时同步表格本地过滤
  if (activeTab.value === 'feishu' && dramaStatusBoardRef.value) {
    dramaStatusBoardRef.value.setSearchKeyword(keyword)
  }

  // 执行远程搜索
  await performSearch(keyword, 1)
}

// 执行搜索接口调用
async function performSearch(keyword: string, page: number) {
  try {
    searchLoading.value = true
    searchCurrentPage.value = page

    // 计算时间范围（过去30天到未来30天，使用北京时间）
    const now = dayjs().tz('Asia/Shanghai')
    const startTime = Math.floor(now.subtract(30, 'day').valueOf() / 1000)
    const endTime = Math.floor(now.add(30, 'day').valueOf() / 1000)

    // 并发请求搜索接口和下载任务列表
    // 名称转 ID 的逻辑已移至后端处理
    const [searchResult, downloadResult] = await Promise.all([
      // 获取搜索结果（后端会自动处理名称转 ID）
      searchNewDramaList({
        query: keyword,
        page_index: page - 1, // 接口从0开始
        page_size: searchPageSize.value,
      }),
      // 获取下载任务列表（获取所有状态）
      getDownloadTaskList({
        start_time: startTime,
        end_time: endTime,
        page_index: 0,
        page_size: 20000,
        // 移除 task_status 过滤，获取所有状态的下载任务
      }),
    ])

    if (searchResult.code === 0 && searchResult.data) {
      const searchDramaData = searchResult.data.data || []
      searchResults.value = searchDramaData
      searchTotal.value = searchResult.data.total || 0

      // 处理下载数据，为搜索结果关联下载状态
      if (downloadResult.data && Array.isArray(downloadResult.data)) {
        // 使用与页面初始化相同的逻辑处理下载数据
        const searchDownloadList = filterDownloadData(downloadResult.data, searchDramaData)

        // 将搜索结果的下载数据合并到全局下载列表中
        // 这样可以确保 getDownloadDataForDrama 函数能找到对应的下载状态
        const existingDownloadList = downloadList.value || []
        downloadList.value = mergeDownloadTasks(existingDownloadList, searchDownloadList)
        console.log('downloadList.value', downloadList.value)
      }

      console.log(
        '搜索结果已包含飞书状态和下载状态:',
        searchResults.value.map(d => ({
          name: d.series_name,
          feishu_downloaded: d.feishu_downloaded,
          downloadStatus: getDownloadDataForDrama(d.series_name)?.task_status,
        }))
      )
    } else {
      searchResults.value = []
      searchTotal.value = 0
    }
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = []
    searchTotal.value = 0
  } finally {
    searchLoading.value = false
  }
}

// 注意：飞书状态现在由后端接口直接提供，无需前端重复获取

// 清空搜索
function clearSearch() {
  searchResults.value = []
  searchTotal.value = 0
  searchCurrentPage.value = 1
  currentPage.value = 1
}

// 分页相关方法
async function goToPage(page: number | string) {
  if (typeof page === 'string' || page < 1 || page > totalPages.value) {
    return
  }

  // 如果正在搜索，执行搜索分页
  if (isSearching.value) {
    const keyword = searchKeyword.value.trim()
    if (keyword) {
      await performSearch(keyword, page)
    }
  } else {
    currentPage.value = page
  }

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 搜索分页方法
async function goToSearchPage(page: number) {
  if (page < 1 || page > Math.ceil(searchTotal.value / searchPageSize.value)) {
    return
  }

  const keyword = searchKeyword.value.trim()
  if (keyword) {
    await performSearch(keyword, page)
  }

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 获取排行榜数据
async function fetchRankingList() {
  rankingLoading.value = true
  rankingError.value = ''

  try {
    // 计算时间范围（过去90天到未来30天，使用北京时间）
    // 排行榜数据可能包含更早的剧集，需要扩大时间范围
    const now = dayjs().tz('Asia/Shanghai')
    const startTime = Math.floor(now.subtract(90, 'day').valueOf() / 1000)
    const endTime = Math.floor(now.add(30, 'day').valueOf() / 1000)

    // 构建 filter_options 参数
    const filterOptions: any = { sort_type: 1 }

    // 并发请求排行榜接口和下载任务列表
    const [rankingResult, downloadResult] = await Promise.all([
      // 使用后端接口获取排行榜数据（包含飞书状态）
      http
        .get('/novelsale/distributor/statistic/rank/series/quality/list/v2', {
          params: {
            filter_options: JSON.stringify(filterOptions),
            page_index: rankingPageIndex.value,
            page_size: rankingPageSize.value,
          },
        })
        .then(res => res.data),
      // 获取下载任务列表（获取所有状态）
      getDownloadTaskList({
        start_time: startTime,
        end_time: endTime,
        page_index: 0,
        page_size: 20000,
      }),
    ])

    if (rankingResult.code === 0 && rankingResult.data) {
      // 处理排行榜数据，添加分类标签分割
      const processedRankingData: RankingDramaItem[] = rankingResult.data
        .filter((item: unknown) => {
          const itemData = item as Record<string, unknown>
          // 过滤掉 permission_status 等于 2 的数据
          // 过滤掉 delivery_status 等于 2 的数据
          return itemData.permission_status !== 2 && itemData.delivery_status !== 2
        })
        .map((item: unknown) => {
          const itemData = item as Record<string, unknown>
          return {
            ...itemData,
            book_id: itemData.book_id as string,
            book_name: itemData.book_name as string,
            series_name: itemData.series_name as string,
            category: itemData.category as string,
            category_text: itemData.category_text as string,
            // 优先使用 original_thumb_url，如果不存在则使用 thumb_url
            original_thumb_url: (itemData.original_thumb_url || itemData.thumb_url) as string,
            episode_amount: itemData.episode_amount as number,
            publish_time: itemData.publish_time as string,
            feishu_downloaded: itemData.feishu_downloaded as boolean,
            feishu_exists: itemData.feishu_exists as boolean,
            // 将 category 字段按逗号分割为数组
            category_tags: itemData.category
              ? (itemData.category as string).split(',').map((tag: string) => tag.trim())
              : [],
          } as RankingDramaItem
        })

      // 更新分页信息
      rankingTotal.value = rankingResult.total || 0

      // 直接设置数据（分页模式）
      rankingList.value = processedRankingData
      console.log('downloadResult.value', downloadResult.data)
      console.log('processedRankingData', processedRankingData)

      // 处理下载数据，为排行榜数据关联下载状态
      if (downloadResult.data && Array.isArray(downloadResult.data)) {
        // 使用与页面初始化相同的逻辑处理下载数据
        const filteredRankingDownloadList = filterDownloadData(
          downloadResult.data,
          processedRankingData
        )
        console.log('filteredRankingDownloadList', filteredRankingDownloadList)
        rankingDownloadList.value = filteredRankingDownloadList
      } else {
        console.warn('排行榜下载数据为空，尝试使用全局下载数据')
        // 如果排行榜专用下载数据为空，尝试使用全局下载数据
        if (downloadList.value && downloadList.value.length > 0) {
          const filteredRankingDownloadList = filterDownloadData(
            downloadList.value,
            processedRankingData
          )
          rankingDownloadList.value = filteredRankingDownloadList
        }
      }

      console.log(
        '排行榜数据已包含飞书状态和下载状态:',
        rankingList.value.map(d => ({
          name: d.book_name,
          feishu_downloaded: d.feishu_downloaded,
          feishu_exists: d.feishu_exists,
          downloadStatus: getRankingDownloadDataForDrama(d.book_name)?.task_status,
        }))
      )

      // 调试：检查下载数据匹配情况
      console.log('排行榜下载数据匹配情况:')
      console.log(
        '排行榜剧名列表:',
        rankingList.value.map(d => d.book_name)
      )
      console.log(
        '下载任务剧名列表:',
        downloadResult.data?.data?.map((d: any) => d.book_name) || []
      )
      console.log('匹配的下载数据:', rankingDownloadList.value)

      // 检查剧名匹配情况
      const rankingNames = rankingList.value.map(d => d.book_name)
      const downloadNames = downloadResult.data?.data?.map((d: any) => d.book_name) || []
      const matchedNames = rankingNames.filter(name => downloadNames.includes(name))
      console.log('匹配的剧名数量:', matchedNames.length, '总排行榜数量:', rankingNames.length)
      console.log('匹配的剧名:', matchedNames)

      // 检查未匹配的剧名
      const unmatchedRankingNames = rankingNames.filter(
        (name: string) => !downloadNames.includes(name)
      )
      const unmatchedDownloadNames = downloadNames.filter(
        (name: string) => !rankingNames.includes(name)
      )
      console.log('未匹配的排行榜剧名:', unmatchedRankingNames.slice(0, 5)) // 只显示前5个
      console.log('未匹配的下载任务剧名:', unmatchedDownloadNames.slice(0, 5)) // 只显示前5个

      // 检查剧名长度和字符
      if (unmatchedRankingNames.length > 0) {
        console.log(
          '排行榜剧名示例:',
          unmatchedRankingNames[0],
          '长度:',
          unmatchedRankingNames[0].length
        )
        console.log(
          '排行榜剧名字符码:',
          Array.from(unmatchedRankingNames[0]).map((c: string) => c.charCodeAt(0))
        )
      }
      if (unmatchedDownloadNames.length > 0) {
        console.log(
          '下载任务剧名示例:',
          unmatchedDownloadNames[0],
          '长度:',
          unmatchedDownloadNames[0].length
        )
        console.log(
          '下载任务剧名字符码:',
          Array.from(unmatchedDownloadNames[0] as string).map((c: string) => c.charCodeAt(0))
        )
      }
    } else {
      rankingList.value = []
    }
  } catch (error) {
    console.error('获取排行榜数据失败:', error)
    rankingError.value = '获取榜单剧数据失败，请稍后重试'
    rankingList.value = []
  } finally {
    rankingLoading.value = false
  }
}

// 榜单剧分页相关计算属性
const rankingVisiblePages = computed(() => {
  const pages = []
  const total = Math.ceil(rankingTotal.value / rankingPageSize.value)
  const current = rankingPageIndex.value + 1

  if (total <= 7) {
    // 如果总页数不超过7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 如果总页数超过7页，显示省略号
    if (current <= 4) {
      // 当前页在前4页
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后4页
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// 榜单剧分页方法
async function goToRankingPage(page: number | string) {
  if (
    typeof page === 'string' ||
    page < 0 ||
    page >= Math.ceil(rankingTotal.value / rankingPageSize.value)
  ) {
    return
  }

  rankingPageIndex.value = page
  await fetchRankingList()

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 组件挂载时获取数据
onMounted(async () => {
  // 从服务器同步最新的认证配置（Cookie 等）
  try {
    const response = await fetch('/api/auth/config')
    if (response.ok) {
      const { data } = await response.json()
      if (data && data.platforms?.changdu) {
        apiConfigStore.updateFromAuthConfig({ platforms: data.platforms })
      }
    } else {
      console.warn('获取认证配置失败，使用本地配置')
    }
  } catch (error) {
    console.warn('同步认证配置失败，使用本地配置:', error)
  }

  // 加载抖音号素材配置
  // 模板版固定主体为每日
  douyinMaterialStore.loadFromServer()

  // 模板版固定主体为每日
  accountStore.initAccount()
  dramaSubjectStore.setSubject('每日')
  if (accountStore.currentAccount !== 'daily') {
    await accountStore.switchAccount('daily')
  }

  // 根据当前激活的 tab 加载对应的数据
  if (activeTab.value === 'new-drama') {
    // 新剧抢跑 tab：加载新剧数据
    fetchDramaList()
  } else if (activeTab.value === 'ranking') {
    // 榜单剧 tab：加载榜单数据
    fetchRankingList()
  }

  // 检查服务端自动提交状态，如果正在运行则恢复UI状态
  try {
    const statusResult = await getAutoSubmitStatus()
    if (statusResult.code === 0 && statusResult.data) {
      // 更新状态
      autoSubmitStatus.value = normalizeAutoSubmitStatus(statusResult.data)
      // 如果当前主体启用了自动提交，开始轮询
      if (currentSubjectStatus.value.enabled) {
        startStatusPolling()
      }
    }
  } catch (error) {
    console.log('检查服务端自动提交状态失败:', error)
  }
})
</script>

<style scoped>
@import '@/assets/newDramaPreview.css';

.secondary-tab-sticky {
  top: 124px;
}

@media (max-width: 640px) {
  .secondary-tab-sticky {
    top: 156px;
  }
}
</style>
