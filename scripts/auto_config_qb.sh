#!/bin/bash
# ==============================================================================
# Torrenta - qBittorrent 一键自动配置与优化脚本 (专为飞牛 fnOS 及 Linux Docker 设计)
# 作用: 自动探测 qBittorrent 容器及配置，自动注入反向代理放行与 127.0.0.1 本地免密
# 使用方法:
#   bash <(curl -sSL https://raw.githubusercontent.com/fulcoo/Torrenta/main/scripts/auto_config_qb.sh)
#   或 (国内加速):
#   bash <(curl -sSL https://ghproxy.net/https://raw.githubusercontent.com/fulcoo/Torrenta/main/scripts/auto_config_qb.sh)
# ==============================================================================

set -e

# 终端色彩定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 确保常用系统工具与 Docker 路径均在 PATH 中
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/trim/bin:/var/apps/docker/bin:$PATH"

USER_SPECIFIED_DIR="${1:-}"

log_info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] ℹ️  $1${NC}"
}
log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}
log_warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}
log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

echo -e "${BOLD}${BLUE}==================================================================${NC}"
echo -e "${BOLD}${GREEN}🚀 Torrenta - qBittorrent 一键自动配置与优化工具${NC}"
echo -e "${BOLD}${BLUE}==================================================================${NC}"

CONF_PATH=""
CONFIG_DIR=""
CONTAINER=""

# 0. 优先检查用户是否传入了自定义路径参数
if [ -n "${USER_SPECIFIED_DIR}" ]; then
    log_info "用户指定了配置路径参数: [${USER_SPECIFIED_DIR}]"
    if [ -f "${USER_SPECIFIED_DIR}" ] && echo "${USER_SPECIFIED_DIR}" | grep -Eiq "qbittorrent.*\.conf"; then
        CONF_PATH="${USER_SPECIFIED_DIR}"
        CONFIG_DIR="$(dirname "${CONF_PATH}")"
        [ "$(basename "${CONFIG_DIR}")" = "qBittorrent" ] && CONFIG_DIR="$(dirname "${CONFIG_DIR}")"
    elif [ -d "${USER_SPECIFIED_DIR}" ]; then
        found_in_user=$(find "${USER_SPECIFIED_DIR}" -maxdepth 4 -iname "*qbittorrent*.conf" 2>/dev/null | head -n 1 || true)
        if [ -n "${found_in_user}" ] && [ -f "${found_in_user}" ]; then
            CONF_PATH="${found_in_user}"
            CONFIG_DIR="$(dirname "${CONF_PATH}")"
            [ "$(basename "${CONFIG_DIR}")" = "qBittorrent" ] && CONFIG_DIR="$(dirname "${CONFIG_DIR}")"
            log_success "成功在指定目录定位到配置文件: [${CONF_PATH}]"
        else
            CONFIG_DIR="${USER_SPECIFIED_DIR}"
        fi
    fi
fi

# 1. 尝试通过 Docker 深度检测运行中的 qBittorrent 容器
if [ -z "${CONF_PATH}" ]; then
    DOCKER_BIN=""
    for d in $(command -v docker 2>/dev/null) /usr/bin/docker /usr/local/bin/docker /usr/trim/bin/docker; do
        if [ -x "$d" ]; then
            DOCKER_BIN="$d"
            break
        fi
    done

    if [ -n "${DOCKER_BIN}" ]; then
        log_info "检测到 Docker 环境: [${DOCKER_BIN}]，正在检索 qBittorrent 容器..."
        DOCKER_OUT=$(${DOCKER_BIN} ps --format "{{.Names}}" 2>&1 || true)
        if echo "${DOCKER_OUT}" | grep -qi "permission denied"; then
            if command -v sudo >/dev/null 2>&1; then
                DOCKER_BIN="sudo ${DOCKER_BIN}"
                DOCKER_OUT=$(${DOCKER_BIN} ps --format "{{.Names}}" 2>&1 || true)
            fi
        fi

        CONTAINERS=$(echo "${DOCKER_OUT}" | grep -v "^$" || true)
        for c in ${CONTAINERS}; do
            img=$(${DOCKER_BIN} inspect "$c" --format "{{.Config.Image}}" 2>/dev/null || true)
            if echo "$c $img" | grep -Eiq "qbittorrent|qb"; then
                log_success "匹配到正在运行的 qBittorrent 容器: [${c}] (镜像: ${img})"
                CONTAINER="$c"
                # 提取容器的所有挂载卷 (Source::Destination)
                mounts=$(${DOCKER_BIN} inspect "$c" --format '{{range .Mounts}}{{.Source}}::{{.Destination}}{{"\n"}}{{end}}' 2>/dev/null || true)
                for m in ${mounts}; do
                    src=$(echo "$m" | awk -F '::' '{print $1}')
                    dst=$(echo "$m" | awk -F '::' '{print $2}')
                    if [ "$dst" = "/config" ] || echo "$dst" | grep -qi "config"; then
                        if [ -d "$src" ]; then
                            CONFIG_DIR="$src"
                            found_m=$(find "$src" -maxdepth 3 -iname "*qbittorrent*.conf" 2>/dev/null | head -n 1 || true)
                            if [ -n "$found_m" ] && [ -f "$found_m" ]; then
                                CONF_PATH="$found_m"
                                log_success "成功通过 Docker 挂载提取配置文件: [${CONF_PATH}]"
                                break 2
                            fi
                        fi
                    fi
                done
            fi
        done
    fi
fi

# 2. 飞牛 fnOS 专属路径极速智能匹配 (涵盖大写 Docker / 小写 docker)
if [ -z "${CONF_PATH}" ] || [ ! -f "${CONF_PATH}" ]; then
    log_info "正在进行飞牛专属存储路径特征检索 (含 /vol*/1000/Docker 等)..."
    
    shopt -s nullglob
    CANDIDATES=(
        /vol*/1000/[Dd]ocker/*/[Cc]onfig/qBittorrent/qBittorrent.conf
        /vol*/1000/[Dd]ocker/*/[Cc]onfig/qbittorrent/qBittorrent.conf
        /vol*/1000/[Dd]ocker/*/[Cc]onfig/qBittorrent.conf
        /vol*/1000/[Dd]ocker/*/[Cc]onfig/qbittorrent.conf
        /vol*/1000/[Dd]ocker/*/qBittorrent/qBittorrent.conf
        /vol*/1000/[Dd]ocker/*/qbittorrent/qBittorrent.conf
        /vol*/1000/[Dd]ocker/*/qBittorrent.conf
        /vol*/[Dd]ocker/*/[Cc]onfig/qBittorrent/qBittorrent.conf
        /vol*/[Dd]ocker/*/[Cc]onfig/qbittorrent/qBittorrent.conf
        /vol*/[Dd]ocker/*/[Cc]onfig/qBittorrent.conf
        /vol*/[Dd]ocker/*/qBittorrent/qBittorrent.conf
        /vol*/[Dd]ocker/*/qbittorrent/qBittorrent.conf
        /vol*/[Dd]ocker/*/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/[Cc]onfig/qBittorrent/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/[Cc]onfig/qbittorrent/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/[Cc]onfig/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/qBittorrent/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/qbittorrent/qBittorrent.conf
        /vol*/*/[Dd]ocker/*/qBittorrent.conf
        /vol*/@appdata/*/qBittorrent/qBittorrent.conf
        /vol*/@appdata/*/qbittorrent/qBittorrent.conf
        /vol*/@appdata/*/qBittorrent.conf
        /vol*/@appdata/qbittorrent/qBittorrent.conf
        /DATA/[Dd]ocker/*/[Cc]onfig/qBittorrent/qBittorrent.conf
        /DATA/[Dd]ocker/*/qBittorrent/qBittorrent.conf
        /root/[Dd]ocker/*/[Cc]onfig/qBittorrent/qBittorrent.conf
    )
    shopt -u nullglob

    for cand in "${CANDIDATES[@]}"; do
        if [ -f "$cand" ]; then
            CONF_PATH="$cand"
            CONFIG_DIR="$(dirname "$cand")"
            [ "$(basename "$CONFIG_DIR")" = "qBittorrent" ] && CONFIG_DIR="$(dirname "$CONFIG_DIR")"
            log_success "成功在飞牛 Docker 存储目录匹配到配置文件: [${CONF_PATH}]"
            break
        fi
    done
fi

# 3. 针对飞牛重点用户目录进行深度搜索 (maxdepth 8，不搜媒体盘)
if [ -z "${CONF_PATH}" ] || [ ! -f "${CONF_PATH}" ]; then
    log_info "正在对用户存储目录进行深度搜索 (maxdepth 8)..."
    for search_root in /vol*/1000/[Dd]ocker /vol*/1000 /vol*/[Dd]ocker /DATA/[Dd]ocker /root/[Dd]ocker; do
        if [ -d "$search_root" ]; then
            found_deep=$(find "$search_root" -maxdepth 8 -iname "*qbittorrent*.conf" 2>/dev/null | head -n 1 || true)
            if [ -n "$found_deep" ] && [ -f "$found_deep" ]; then
                CONF_PATH="$found_deep"
                CONFIG_DIR="$(dirname "$found_deep")"
                [ "$(basename "$CONFIG_DIR")" = "qBittorrent" ] && CONFIG_DIR="$(dirname "$CONFIG_DIR")"
                log_success "深度检索成功定位配置文件: [${CONF_PATH}]"
                break
            fi
        fi
    done
fi

if [ -z "${CONF_PATH}" ] || [ ! -f "${CONF_PATH}" ]; then
    log_error "未能在本机自动定位到 qBittorrent.conf 文件。"
    echo -e "${YELLOW}👉 提示: 请在脚本后附带您的配置目录参数重试，例如:${NC}"
    echo -e "   bash <(curl -sSL ...) /vol1/1000/Docker/qbittorrent/config"
    exit 1
fi

log_info "目标配置文件确认: [${CONF_PATH}]"

# 4. 关键判断：检查是否已经具备所需配置 (已修改的情况)
if grep -q "WebUI\\\\LocalHostAuth=false" "${CONF_PATH}" 2>/dev/null && \
   grep -q "WebUI\\\\HostHeaderValidation=false" "${CONF_PATH}" 2>/dev/null; then
    echo ""
    echo -e "${BOLD}${GREEN}==================================================================${NC}"
    log_success "检测到该 qBittorrent 已经完成过配置！"
    log_info "当前已启用: 127.0.0.1 本地免密 + WebUI 反向代理/Host 标头放行"
    log_info "状态完全正常，无需重复修改！"
    echo -e "${BOLD}${GREEN}==================================================================${NC}"
    exit 0
fi

# 5. 创建安全备份
BACKUP_PATH="${CONF_PATH}.bak.$(date +%Y%m%d_%H%M%S)"
cp -f "${CONF_PATH}" "${BACKUP_PATH}"
log_success "已自动创建配置备份: [${BACKUP_PATH}]"

# 6. 写入 LinuxServer custom-cont-init.d Hook 脚本 (持久自愈：即使容器更新、重建也永久有效)
if [ -n "${CONFIG_DIR}" ] && [ -d "${CONFIG_DIR}" ]; then
    HOOK_DIR="${CONFIG_DIR}/custom-cont-init.d"
    mkdir -p "${HOOK_DIR}" 2>/dev/null || true
    cat <<'HOOK_EOF' > "${HOOK_DIR}/99-torrenta-webui.sh"
#!/bin/bash
CONF="/config/qBittorrent/qBittorrent.conf"
[ -f "$CONF" ] || CONF="/config/qBittorrent.conf"
if [ -f "$CONF" ]; then
    sed -i '/WebUI\\HostHeaderValidation/d' "$CONF"
    sed -i '/WebUI\\CSRFProtection/d' "$CONF"
    sed -i '/WebUI\\LocalHostAuth/d' "$CONF"
    sed -i '/WebUI\\AuthSubnetWhitelist/d' "$CONF"
    sed -i '/\[Preferences\]/a WebUI\\HostHeaderValidation=false\nWebUI\\CSRFProtection=false\nWebUI\\LocalHostAuth=false\nWebUI\\AuthSubnetWhitelistEnabled=true\nWebUI\\AuthSubnetWhitelist=127.0.0.1/32, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12' "$CONF"
fi
HOOK_EOF
    chmod +x "${HOOK_DIR}/99-torrenta-webui.sh" 2>/dev/null || true
    log_success "已注入持久自愈 Hook: [${HOOK_DIR}/99-torrenta-webui.sh] (容器更新后自动常驻生效)"
fi

# 7. 安全停止容器并写入文件 (避免 qBittorrent 退出时覆盖配置文件)
if [ -n "${CONTAINER}" ]; then
    log_info "正在平滑停止容器 [${CONTAINER}] 以安全写入磁盘..."
    ${DOCKER_BIN:-docker} stop "${CONTAINER}" >/dev/null 2>&1 || true
fi

# 8. 写入配置到 qBittorrent.conf
sed -i '/WebUI\\HostHeaderValidation/d' "${CONF_PATH}"
sed -i '/WebUI\\CSRFProtection/d' "${CONF_PATH}"
sed -i '/WebUI\\LocalHostAuth/d' "${CONF_PATH}"
sed -i '/WebUI\\AuthSubnetWhitelist/d' "${CONF_PATH}"

if grep -q "\[Preferences\]" "${CONF_PATH}"; then
    sed -i '/\[Preferences\]/a WebUI\\HostHeaderValidation=false\nWebUI\\CSRFProtection=false\nWebUI\\LocalHostAuth=false\nWebUI\\AuthSubnetWhitelistEnabled=true\nWebUI\\AuthSubnetWhitelist=127.0.0.1/32, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12' "${CONF_PATH}"
else
    cat <<'EOF' >> "${CONF_PATH}"

[Preferences]
WebUI\HostHeaderValidation=false
WebUI\CSRFProtection=false
WebUI\LocalHostAuth=false
WebUI\AuthSubnetWhitelistEnabled=true
WebUI\AuthSubnetWhitelist=127.0.0.1/32, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
EOF
fi
log_success "已成功向 [Preferences] 注入反向代理放行与 127.0.0.1 本地免密参数"

# 9. 修正属主权限 (保留原配置文件的 UID/GID，防止容器权限报错)
if [ -f "${BACKUP_PATH}" ]; then
    chown --reference="${BACKUP_PATH}" "${CONF_PATH}" 2>/dev/null || true
fi
if [ -n "${CONFIG_DIR}" ] && [ -d "${CONFIG_DIR}" ]; then
    chown -R 911:911 "${CONFIG_DIR}/custom-cont-init.d" 2>/dev/null || true
fi

# 10. 重新启动容器
if [ -n "${CONTAINER}" ]; then
    log_info "正在重新启动容器 [${CONTAINER}]..."
    ${DOCKER_BIN:-docker} start "${CONTAINER}" >/dev/null 2>&1 || true
    log_success "容器 [${CONTAINER}] 已成功重新启动并加载最新配置！"
fi

echo ""
echo -e "${BOLD}${GREEN}==================================================================${NC}"
echo -e "${BOLD}${GREEN}🎉 恭喜！qBittorrent 自动化优化全部完成，现在可以顺畅连接 Torrenta 了！${NC}"
echo -e "${BOLD}${GREEN}==================================================================${NC}"
