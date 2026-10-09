import { SEER_TYPE_DATA } from "../seer-type-data.js";

export const TYPE_CALCULATOR_TEMPLATE = `
            <div class="type-calc-wrapper">
                <!-- 功能一：屬性倍率查詢 -->
                <div id="type-calc-view-lookup" class="type-calc-view-section">
                    <!-- 頂部屬性卡片：使用與精靈篩選相同的 trigger-card 樣式 -->
                    <div id="type-calc-trigger-card" class="seer-pet-type-trigger-card" role="button" tabindex="0" aria-haspopup="dialog" aria-label="開啟屬性選擇視窗">
                        <div class="seer-pet-type-current-info">
                            <span class="seer-pet-type-trigger-label">當前計算屬性</span>
                            <div class="seer-pet-type-current-badge">
                                <img id="type-calc-current-icon" class="seer-pet-type-current-icon" alt="" hidden>
                                <span id="type-calc-current-name">尚未選擇</span>
                                <span id="type-calc-current-tag" class="type-calc-tag" hidden></span>
                            </div>
                        </div>
                        <button id="type-calc-open-modal-button" class="primary-button compact-button seer-pet-type-trigger-button" type="button" aria-haspopup="dialog">
                            <span>選擇屬性</span>
                            <span aria-hidden="true">▾</span>
                        </button>
                    </div>

                    <!-- 模式切換與搜尋列 -->
                    <div class="type-calc-controls-bar">
                        <div class="type-calc-mode-tabs" role="tablist" aria-label="計算模式切換">
                            <button id="type-calc-mode-attack" class="type-calc-mode-tab is-active" type="button" role="tab" aria-selected="true" data-mode="attack">
                                ⚔️ 攻擊效果
                            </button>
                            <button id="type-calc-mode-defense" class="type-calc-mode-tab" type="button" role="tab" aria-selected="false" data-mode="defense">
                                🛡️ 被攻擊效果
                            </button>
                        </div>

                        <!-- 搜尋目標屬性 -->
                        <div class="type-calc-search-box">
                            <input id="type-calc-target-search" class="text-input type-calc-search-input" type="search" placeholder="搜尋目標屬性名稱…" autocomplete="off">
                        </div>
                    </div>

                    <!-- 統計與快速篩選標籤 (採用遊戲官方正統術語：克制、普通、微弱、無效) -->
                    <div class="type-calc-stats-bar">
                        <div class="type-calc-filter-pills" role="toolbar" aria-label="倍率篩選">
                            <button class="type-calc-pill is-active" type="button" data-filter="all">全部 (<span id="type-count-all">${SEER_TYPE_DATA.combinations.length}</span>)</button>
                            <button class="type-calc-pill" type="button" data-filter="counter">克制 (<span id="type-count-counter">0</span>)</button>
                            <button class="type-calc-pill" type="button" data-filter="normal">普通 (<span id="type-count-normal">0</span>)</button>
                            <button class="type-calc-pill" type="button" data-filter="weak">微弱 (<span id="type-count-weak">0</span>)</button>
                            <button class="type-calc-pill" type="button" data-filter="zero">無效 (<span id="type-count-zero">0</span>)</button>
                        </div>
                    </div>

                    <!-- 結果展示區塊 -->
                    <div class="type-calc-results-section">
                        <div id="type-calc-card-grid" class="type-card-grid" aria-live="polite">
                            <!-- 屬性卡片網格 -->
                        </div>
                    </div>
                </div>

                <!-- 功能二：對局屬性助手 -->
                <div id="type-calc-view-vs" class="type-calc-view-section type-vs-container" hidden>
                    <!-- 雙方屬性選擇器 -->
                    <div class="type-vs-selector-row">
                        <!-- 我方屬性 A -->
                        <div id="type-vs-trigger-a" class="type-vs-picker-card" role="button" tabindex="0" aria-label="選擇我方屬性">
                            <span class="type-vs-picker-role">我方屬性</span>
                            <div class="type-vs-picker-content">
                                <img id="type-vs-icon-a" class="type-vs-picker-icon" alt="" hidden>
                                <div class="type-vs-picker-meta">
                                    <span id="type-vs-name-a" class="type-vs-picker-name">尚未選擇</span>
                                </div>
                            </div>
                            <button id="type-vs-btn-a" class="primary-button compact-button type-vs-change-btn" type="button">更換屬性 ▾</button>
                        </div>

                        <!-- 互換按鈕 -->
                        <button id="type-vs-swap-btn" class="type-vs-swap-button" type="button" title="互換雙方屬性" aria-label="互換雙方屬性">
                            <span class="type-vs-swap-icon">⇄</span>
                        </button>

                        <!-- 對方屬性 B -->
                        <div id="type-vs-trigger-b" class="type-vs-picker-card" role="button" tabindex="0" aria-label="選擇對方屬性">
                            <span class="type-vs-picker-role is-opponent">對方屬性</span>
                            <div class="type-vs-picker-content">
                                <img id="type-vs-icon-b" class="type-vs-picker-icon" alt="" hidden>
                                <div class="type-vs-picker-meta">
                                    <span id="type-vs-name-b" class="type-vs-picker-name">尚未選擇</span>
                                </div>
                            </div>
                            <button id="type-vs-btn-b" class="primary-button compact-button type-vs-change-btn" type="button">更換屬性 ▾</button>
                        </div>
                    </div>

                    <div class="type-vs-stone-selection">
                        <span>我方技能石</span>
                        <button id="type-vs-stone-select" class="secondary-button compact-button" type="button" aria-haspopup="dialog">不攜帶 ▾</button>
                    </div>
                    <p id="type-vs-empty" class="panel-description" role="status">請選擇我方與對方屬性。</p>
                    <div class="type-vs-results-grid" aria-live="polite" aria-label="攻擊倍率" hidden>
                        <div class="type-vs-result-card">
                            <span id="type-vs-card-title-a" class="type-vs-result-title"></span>
                            <div class="type-vs-stat-val-group">
                                <span id="type-vs-atk-mult-a" class="type-vs-stat-multiplier"></span>
                                <span id="type-vs-atk-badge-a" class="type-vs-stat-tag"></span>
                            </div>
                        </div>
                        <div class="type-vs-result-card">
                            <span id="type-vs-card-title-b" class="type-vs-result-title"></span>
                            <div class="type-vs-stat-val-group">
                                <span id="type-vs-atk-mult-b" class="type-vs-stat-multiplier"></span>
                                <span id="type-vs-atk-badge-b" class="type-vs-stat-tag"></span>
                            </div>
                        </div>
                    </div>
                    <div id="type-vs-stone-result" class="type-vs-result-card" aria-live="polite" hidden>
                        <span id="type-vs-stone-title" class="type-vs-result-title"></span>
                        <div class="type-vs-stat-val-group">
                            <span id="type-vs-stone-mult" class="type-vs-stat-multiplier"></span>
                            <span id="type-vs-stone-badge" class="type-vs-stat-tag"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
