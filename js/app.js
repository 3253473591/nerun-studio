// Nerun工作室展示站点主逻辑
// 管理数据加载、筛选状态、微信环境处理、剪贴板操作及模态框控制

/**
 * 检测当前浏览器是否为微信内置浏览器
 * 用于判断是否拦截外链跳转
 */
function isWechat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 默认配置常量：当 JSON 加载失败时的降级配置
const DEFAULT_CONFIG = {
  site: {
    name: "Nerun工作室",
    tagline: "以歌声合成为主的音乐全案制作团队",
    title: "Nerun工作室 | 音乐全案制作",
    copyright: "© 2026 Nerun Studio. All rights reserved."
  },
  contact: {
    wechat: { id: "NeurnOfficial", label: "微信" },
    email: { address: "neruuu@qq.com", label: "邮箱" }
  },
  boss: {
    badge: { icon: "👑", text: "运营" },
    borderColor: "#eab308"
  },
  navigation: {
    all: "全部",
    allEngines: "全部引擎",
    selectHomepage: "请选择要访问的主页",
    expandBio: "点击展开更多"
  }
};

// 默认 UI 文案常量
const DEFAULT_UI_TEXT = {
  loading: {
    errorTitle: "加载失败",
    retry: "重新加载"
  },
  emptyState: {
    icon: "🎵",
    title: "暂无该分类成员",
    subtitle: "敬请期待更多创作者加入"
  },
  toast: {
    wechatCopied: "微信号已复制",
    emailCopied: "邮箱已复制",
    linkCopied: "链接已复制到剪贴板",
    copyFailed: "复制失败，请手动复制",
    noHomepage: "该成员暂无主页链接"
  },
  modal: {
    wechat: {
      title: "即将离开微信",
      message: "该链接将在外部浏览器打开，是否继续访问？",
      cancel: "取消",
      copyLink: "复制链接",
      continue: "继续访问"
    },
    homepage: {
      title: "请选择要访问的主页",
      cancel: "取消"
    }
  },
  errors: {
    loadDept: "加载部门数据失败",
    loadMember: "加载成员数据失败"
  }
};

// 默认域名白名单：微信内可直接跳转，无需拦截
const DEFAULT_WHITELIST = [
  "mp.weixin.qq.com",
  "m.tb.cn",
  "jd.com",
  "taobao.com",
  "tmall.com",
  "weibo.com",
  "qq.com"
];

/**
 * 检查 URL 是否在白名单内
 * @param {string} url - 待检查的链接
 * @param {string[]} whitelist - 允许的域名列表
 * @returns {boolean} 是否在白名单内
 */
function isWhitelist(url, whitelist = DEFAULT_WHITELIST) {
  try {
    const urlObj = new URL(url);
    return whitelist.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * 解析个人简介文本，转换为 HTML
 * 支持 Markdown 链接语法 [text](url)、自动 URL 识别、<br>标签和换行符
 * @param {string} text - 原始简介文本
 * @returns {string} 处理后的 HTML 字符串
 */
function parseBio(text) {
  if (!text) return "";
  
  // 临时替换 <br> 标签为占位符，防止被转义
  const BR_PLACEHOLDER = "\u0000BR\u0000";
  let processed = text.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
  
  // HTML 转义（防止 XSS）
  const div = document.createElement("div");
  div.textContent = processed;
  processed = div.innerHTML;
  
  // 恢复 <br> 标签
  processed = processed.replace(new RegExp(BR_PLACEHOLDER, "g"), "<br>");
  
  // 将换行符 \n 也转为 <br>
  processed = processed.replace(/\n/g, "<br>");
  
  // 解析 Markdown 链接 [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, \'$2\')">$1</a>',
  );
  
  // 自动识别 URL 为链接
  const urlRegex = /(https?:\/\/[^\s<]+)(?![^<]*<\/a>)/g;
  processed = processed.replace(urlRegex, (url) => {
    if (processed.indexOf(`href="${url}"`) > -1) return url;
    return `<a href="${url}" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, '${url}')">${url}</a>`;
  });
  
  return processed;
}

/**
 * 全局链接点击处理器
 * 在微信环境中拦截非白名单外链，弹出确认模态框
 * @param {Event} event - 点击事件对象
 * @param {string} url - 目标链接
 * @returns {boolean} 是否允许默认跳转行为
 */
window.handleLinkClick = function (event, url) {
  const whitelist = Alpine.store("config")?.whitelist || DEFAULT_WHITELIST;
  if (isWechat() && !isWhitelist(url, whitelist)) {
    event.preventDefault();
    Alpine.store("wechatModal").open(url);
    return false;
  }
  return true;
};

// Alpine.js 初始化：注册全局状态存储
document.addEventListener("alpine:init", () => {
  
  /**
   * 配置存储：管理站点配置和白名单数据
   * 从 JSON 文件异步加载配置，失败时使用默认配置
   */
  Alpine.store("config", {
    data: DEFAULT_CONFIG,
    whitelist: DEFAULT_WHITELIST,
    async load() {
      try {
        const [configRes, whitelistRes] = await Promise.all([
          fetch("data/site-config.json"),
          fetch("data/whitelist.json")
        ]);
        
        if (configRes.ok) {
          this.data = await configRes.json();
        }
        if (whitelistRes.ok) {
          const whitelistData = await whitelistRes.json();
          this.whitelist = whitelistData.domains || DEFAULT_WHITELIST;
        }
      } catch (e) {
        console.warn("使用默认配置");
      }
    }
  });

  /**
   * UI 文案存储：管理界面多语言/自定义文案
   * 支持从 JSON 加载覆盖默认文案
   */
  Alpine.store("uiText", {
    ...DEFAULT_UI_TEXT,
    async load() {
      try {
        const res = await fetch("data/ui-text.json");
        if (res.ok) {
          Object.assign(this, await res.json());
        }
      } catch (e) {
        console.warn("使用默认UI文案");
      }
    }
  });

  /**
   * 微信外链模态框存储：控制外链拦截弹窗
   * 管理弹窗显隐、URL 缓存及用户操作（继续访问/复制链接）
   */
  Alpine.store("wechatModal", {
    isOpen: false,
    url: "",
    open(url) {
      this.url = url;
      this.isOpen = true;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.isOpen = false;
      this.url = "";
      document.body.style.overflow = "";
    },
    proceed() {
      if (this.url) window.open(this.url, "_blank");
      this.close();
    },
    async copyLink() {
      if (!this.url) return;
      const toastMsg = Alpine.store("uiText").toast.linkCopied || "链接已复制到剪贴板";
      const toastErr = Alpine.store("uiText").toast.copyFailed || "复制失败，请手动复制";
      
      try {
        await navigator.clipboard.writeText(this.url);
        Alpine.store("toast").show(toastMsg);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = this.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          Alpine.store("toast").show(toastMsg);
        } catch {
          Alpine.store("toast").show(toastErr);
        }
        document.body.removeChild(textarea);
      }
    },
  });

  /**
   * Toast 提示存储：显示短暂的状态提示消息
   * 自动管理显示时长和超时清理
   */
  Alpine.store("toast", {
    isVisible: false,
    message: "",
    timeout: null,
    show(message, duration = 2000) {
      this.message = message;
      this.isVisible = true;
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.isVisible = false;
        this.message = "";
      }, duration);
    },
  });

  /**
   * 主页选择模态框存储：管理多主页成员的选择弹窗
   * 当成员有多个主页链接时，提供选择菜单
   */
  Alpine.store("homepageModal", {
    isOpen: false,
    memberName: "",
    avatar: "",        // 新增：存储头像 URL
    links: [],
    open(links, memberName, avatar) {    // 添加 avatar 参数
      if (!links || links.length === 0) {
        const msg = Alpine.store("uiText").toast.noHomepage || "该成员暂无主页链接";
        Alpine.store("toast").show(msg);
        return;
      }
      this.links = links;
      this.memberName = memberName;
      this.avatar = avatar || "";        // 保存头像 URL
      this.isOpen = true;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.isOpen = false;
      this.links = [];
      this.memberName = "";
      this.avatar = "";                  // 清理头像
      document.body.style.overflow = "";
    },
    navigate(url) {
      const whitelist = Alpine.store("config").whitelist || DEFAULT_WHITELIST;
      if (isWechat() && !isWhitelist(url, whitelist)) {
        Alpine.store("wechatModal").open(url);
        this.close();
      } else {
        window.open(url, "_blank");
        this.close();
      }
    }
  });
});

/**
 * 主应用控制器：管理成员展示的核心逻辑
 * 包含数据加载、多级筛选（部门/角色/软件）、排序及交互处理
 */
function studioApp() {
  return {
    departments: [],        // 部门及角色数据
    members: [],           // 成员列表
    currentDepartment: "all", // 当前选中的部门 ID
    currentRole: "all",    // 当前选中的角色 ID
    currentSoftware: "all", // 当前选中的软件 ID
    loading: true,         // 数据加载状态
    error: null,           // 错误信息
    config: DEFAULT_CONFIG, // 站点配置
    uiText: DEFAULT_UI_TEXT, // UI 文案

    /**
     * 计算属性：获取当前部门下的角色列表
     */
    get currentRoles() {
      if (this.currentDepartment === "all") return [];
      const dept = this.departments.find(d => d.id === this.currentDepartment);
      return dept ? (dept.roles || []) : [];
    },

    /**
     * 计算属性：获取当前角色下的软件/引擎列表
     */
    get currentSoftwares() {
      if (this.currentRole === "all") return [];
      const role = this.currentRoles.find(r => r.id === this.currentRole);
      return role ? (role.softwares || []) : [];
    },

    /**
     * 计算属性：根据当前筛选条件过滤并排序成员列表
     * 支持部门筛选 -> 角色筛选 -> 软件筛选的三级联动
     */
    get filteredMembers() {
      let result = [];

      if (this.currentDepartment === "all") {
        result = this.members;
      } else {
        const dept = this.departments.find(d => d.id === this.currentDepartment);
        if (!dept) return [];
        
        const deptRoleIds = (dept.roles || []).map(r => r.id);
        
        result = this.members.filter((m) => {
          const memberRoles = m.roleIds || (m.roleId ? [m.roleId] : []);
          return memberRoles.some(rid => deptRoleIds.includes(rid));
        });

        if (this.currentRole !== "all") {
          result = result.filter((m) => {
            const memberRoles = m.roleIds || (m.roleId ? [m.roleId] : []);
            return memberRoles.includes(this.currentRole);
          });

          if (this.currentSoftware !== "all" && this.currentSoftwares.length > 0) {
            result = result.filter((m) => {
              if (m.software === this.currentSoftware) return true;
              if (m.softwares && m.softwares.includes(this.currentSoftware)) return true;
              return false;
            });
          }
        }
      }

      return result.sort((a, b) => 
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      );
    },

    /**
     * 初始化应用：加载配置、部门、成员数据
     * 设置页面元信息（标题、描述）
     */
    async init() {
      this.loading = true;
      this.error = null;

      try {
        await Promise.all([
          Alpine.store("config").load(),
          Alpine.store("uiText").load()
        ]);
        
        this.config = Alpine.store("config").data;
        this.uiText = Alpine.store("uiText");

        if (this.config.site?.title) {
          document.title = this.config.site.title;
        }
        if (this.config.site?.description) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.content = this.config.site.description;
        }

        const [deptRes, membersRes] = await Promise.all([
          fetch("data/roles.json"),
          fetch("data/members.json"),
        ]);

        if (!deptRes.ok)
          throw new Error(`${this.uiText.errors.loadDept}: ${deptRes.status}`);
        if (!membersRes.ok)
          throw new Error(`${this.uiText.errors.loadMember}: ${membersRes.status}`);

        this.departments = await deptRes.json();
        const membersData = await membersRes.json();
        
        this.members = membersData.sort(
          (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
        );

        console.log("✅ 数据加载成功:", {
          departments: this.departments.length,
          members: this.members.length,
        });
      } catch (err) {
        console.error("❌ 数据加载失败:", err);
        this.error = err.message;
        this.departments = [];
        this.members = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * 复制文本到剪贴板，并显示对应类型的 Toast 提示
     * @param {string} text - 要复制的文本
     * @param {string} type - 类型标识（wechat/email/link），用于显示对应提示语
     */
    async copyToClipboard(text, type) {
      let successMsg, errorMsg;
      
      if (type === 'wechat') {
        successMsg = this.uiText.toast.wechatCopied;
        errorMsg = this.uiText.toast.copyFailed;
      } else if (type === 'email') {
        successMsg = this.uiText.toast.emailCopied;
        errorMsg = this.uiText.toast.copyFailed;
      } else {
        successMsg = this.uiText.toast.linkCopied;
        errorMsg = this.uiText.toast.copyFailed;
      }
      
      try {
        await navigator.clipboard.writeText(text);
        Alpine.store("toast").show(successMsg);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          Alpine.store("toast").show(successMsg);
        } catch {
          Alpine.store("toast").show(errorMsg);
        }
        document.body.removeChild(textarea);
      }
    },

    /**
     * 处理头像点击事件：打开成员主页
     * 单主页直接跳转，多主页弹出选择菜单
     * @param {Object} member - 成员数据对象
     */
    handleAvatarClick(member) {
      if (!member.homepages || member.homepages.length === 0) {
        Alpine.store("toast").show(this.uiText.toast.noHomepage);
        return;
      }
      
      if (member.homepages.length === 1) {
        const url = member.homepages[0].url;
        const whitelist = Alpine.store("config").whitelist || DEFAULT_WHITELIST;
        if (isWechat() && !isWhitelist(url, whitelist)) {
          Alpine.store("wechatModal").open(url);
        } else {
          window.open(url, "_blank");
        }
      } else {
        // 修改：传入 member.avatar
        Alpine.store("homepageModal").open(member.homepages, member.name, member.avatar);
      }
    },

    /**
     * 切换当前选中的部门，重置下级筛选条件
     * @param {string} deptId - 部门 ID
     */
    selectDepartment(deptId) {
      this.currentDepartment = deptId;
      this.currentRole = "all";
      this.currentSoftware = "all";
    },

    /**
     * 切换当前选中的角色，重置软件筛选
     * @param {string} roleId - 角色 ID
     */
    selectRole(roleId) {
      this.currentRole = roleId;
      this.currentSoftware = "all";
    },

    /**
     * 切换当前选中的软件/引擎
     * @param {string} softwareId - 软件 ID
     */
    selectSoftware(softwareId) {
      this.currentSoftware = softwareId;
    },

    /**
     * 获取当前选中角色的颜色，用于 UI 高亮
     * @returns {string} 颜色代码
     */
    getCurrentRoleColor() {
      if (this.currentRole === "all") {
        const dept = this.departments.find(d => d.id === this.currentDepartment);
        return dept ? "#7AA2F7" : "#7AA2F7";
      }
      const role = this.currentRoles.find(r => r.id === this.currentRole);
      return role ? role.color : "#7AA2F7";
    },

    /**
     * 根据角色 ID 获取对应的颜色值
     * @param {string} roleId - 角色 ID
     * @returns {string} 角色对应的颜色代码
     */
    getRoleColor(roleId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        const role = dept.roles.find(r => r.id === roleId);
        if (role) return role.color;
      }
      return "#7AA2F7";
    },

    /**
     * 根据角色 ID 获取对应的角色名称
     * @param {string} roleId - 角色 ID
     * @returns {string} 角色名称
     */
    getRoleName(roleId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        const role = dept.roles.find(r => r.id === roleId);
        if (role) return role.name;
      }
      return "未知";
    },

    /**
     * 根据软件 ID 获取对应的软件名称
     * @param {string} softwareId - 软件 ID
     * @returns {string} 软件名称
     */
    getSoftwareName(softwareId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        for (const role of dept.roles) {
          if (!role.softwares) continue;
          const sw = role.softwares.find(s => s.id === softwareId);
          if (sw) return sw.name;
        }
      }
      return softwareId.toUpperCase();
    },

    // 引入外部工具函数到组件作用域
    parseBio,
  };
}

// 图片懒加载优化：使用 IntersectionObserver 实现滚动加载
if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          imageObserver.unobserve(img);
        }
      });
    },
    { rootMargin: "50px 0px" },
  );

  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    imageObserver.observe(img);
  });
}

// 微信环境标识：添加特定 CSS 类用于样式调整
if (isWechat()) {
  document.documentElement.classList.add("wechat-ua");
}

// Service Worker 注册：支持 PWA 离线访问（如存在 sw.js）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}