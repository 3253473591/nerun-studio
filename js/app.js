// Nerun工作室展示站点主逻辑

function isWechat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

const DEFAULT_CONFIG = {
  site: {
    name: "Nerun工作室",
    tagline: "以歌声合成为主的音乐全案制作团队",
    title: "Nerun工作室 | 音乐全案制作",
    copyright: "© 2026 Nerun Studio. All rights reserved."
  },
  contact: {
    wechat: { id: "NerunOfficial", label: "微信" },
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
    expandBio: "展开内容"
  }
};

const DEFAULT_UI_TEXT = {
  loading: { errorTitle: "加载失败", retry: "重新加载" },
  emptyState: { icon: "🎵", title: "暂无该分类成员", subtitle: "敬请期待更多创作者加入" },
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
    homepage: { title: "请选择要访问的主页", cancel: "取消" }
  },
  errors: { loadDept: "加载部门数据失败", loadMember: "加载成员数据失败" }
};

const DEFAULT_WHITELIST = [
  "mp.weixin.qq.com", "m.tb.cn", "jd.com", "taobao.com",
  "tmall.com", "weibo.com", "qq.com"
];

function isWhitelist(url, whitelist = DEFAULT_WHITELIST) {
  try {
    const urlObj = new URL(url);
    return whitelist.some(d => urlObj.hostname.includes(d));
  } catch { return false; }
}

function parseBio(text) {
  if (!text) return "";
  const BR = "\u0000BR\u0000";
  let p = text.replace(/<br\s*\/?>/gi, BR);
  const div = document.createElement("div");
  div.textContent = p;
  p = div.innerHTML;
  p = p.replace(new RegExp(BR, "g"), "<br>");
  p = p.replace(/\n/g, "<br>");
  p = p.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, \'$2\')">$1</a>'
  );
  const urlReg = /(https?:\/\/[^\s<]+)(?![^<]*<\/a>)/g;
  p = p.replace(urlReg, url => {
    if (p.indexOf(`href="${url}"`) > -1) return url;
    return `<a href="${url}" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, '${url}')">${url}</a>`;
  });
  return p;
}

/**
 * 判断简介文本行数是否超过阈值
 * 使用换行符 + <br> + 字符长度估算行数
 * @param {string} text - 简介原始文本
 * @param {number} maxLines - 行数阈值
 * @returns {boolean}
 */
function isBioLong(text, maxLines) {
  if (!text) return false;
  // 按换行/br分割段落
  const segments = text.split(/\n|<br\s*\/?>/gi);
  // 估算每段在约 20 个字符宽度下的行数（卡片宽约显示20字）
  const CHARS_PER_LINE = 20;
  let totalLines = 0;
  for (const seg of segments) {
    // 去掉 markdown 链接语法取纯文字长度
    const plain = seg.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]+>/g, '');
    totalLines += Math.max(1, Math.ceil(plain.length / CHARS_PER_LINE));
    if (totalLines > maxLines) return true;
  }
  return totalLines > maxLines;
}

window.handleLinkClick = function(event, url) {
  const wl = Alpine.store("config")?.whitelist || DEFAULT_WHITELIST;
  if (isWechat() && !isWhitelist(url, wl)) {
    event.preventDefault();
    Alpine.store("wechatModal").open(url);
    return false;
  }
  return true;
};

document.addEventListener("alpine:init", () => {

  Alpine.store("config", {
    data: DEFAULT_CONFIG,
    whitelist: DEFAULT_WHITELIST,
    async load() {
      try {
        const [cfgRes, wlRes] = await Promise.all([
          fetch("data/site-config.json"),
          fetch("data/whitelist.json")
        ]);
        if (cfgRes.ok) this.data = await cfgRes.json();
        if (wlRes.ok) {
          const wl = await wlRes.json();
          this.whitelist = wl.domains || DEFAULT_WHITELIST;
        }
      } catch { console.warn("使用默认配置"); }
    }
  });

  Alpine.store("uiText", {
    ...DEFAULT_UI_TEXT,
    async load() {
      try {
        const res = await fetch("data/ui-text.json");
        if (res.ok) Object.assign(this, await res.json());
      } catch { console.warn("使用默认UI文案"); }
    }
  });

  Alpine.store("wechatModal", {
    isOpen: false, url: "",
    open(url) { this.url = url; this.isOpen = true; document.body.style.overflow = "hidden"; },
    close() { this.isOpen = false; this.url = ""; document.body.style.overflow = ""; },
    proceed() { if (this.url) window.open(this.url, "_blank"); this.close(); },
    async copyLink() {
      if (!this.url) return;
      const ok = Alpine.store("uiText").toast.linkCopied || "链接已复制到剪贴板";
      const fail = Alpine.store("uiText").toast.copyFailed || "复制失败，请手动复制";
      try {
        await navigator.clipboard.writeText(this.url);
        Alpine.store("toast").show(ok);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = this.url;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); Alpine.store("toast").show(ok); }
        catch { Alpine.store("toast").show(fail); }
        document.body.removeChild(ta);
      }
    }
  });

  Alpine.store("toast", {
    isVisible: false, message: "", timeout: null,
    show(msg, dur = 2000) {
      this.message = msg; this.isVisible = true;
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => { this.isVisible = false; this.message = ""; }, dur);
    }
  });

  Alpine.store("homepageModal", {
    isOpen: false, memberName: "", avatar: "", links: [],
    open(links, memberName, avatar) {
      if (!links || links.length === 0) {
        Alpine.store("toast").show(Alpine.store("uiText").toast.noHomepage || "该成员暂无主页链接");
        return;
      }
      this.links = links; this.memberName = memberName; this.avatar = avatar || "";
      this.isOpen = true; document.body.style.overflow = "hidden";
    },
    close() { this.isOpen = false; this.links = []; this.memberName = ""; this.avatar = ""; document.body.style.overflow = ""; },
    navigate(url) {
      const wl = Alpine.store("config").whitelist || DEFAULT_WHITELIST;
      if (isWechat() && !isWhitelist(url, wl)) { Alpine.store("wechatModal").open(url); this.close(); }
      else { window.open(url, "_blank"); this.close(); }
    }
  });
});

function studioApp() {
  return {
    departments: [],
    members: [],
    currentDepartment: "all",
    currentRole: "all",
    currentSoftware: "all",
    loading: true,
    error: null,
    config: DEFAULT_CONFIG,
    uiText: DEFAULT_UI_TEXT,

    get currentRoles() {
      if (this.currentDepartment === "all") return [];
      const dept = this.departments.find(d => d.id === this.currentDepartment);
      return dept ? (dept.roles || []) : [];
    },

    get currentSoftwares() {
      if (this.currentRole === "all") return [];
      const role = this.currentRoles.find(r => r.id === this.currentRole);
      return role ? (role.softwares || []) : [];
    },

    get filteredMembers() {
      let result = [];
      if (this.currentDepartment === "all") {
        result = this.members;
      } else {
        const dept = this.departments.find(d => d.id === this.currentDepartment);
        if (!dept) return [];
        const deptRoleIds = (dept.roles || []).map(r => r.id);
        result = this.members.filter(m => {
          const mr = m.roleIds || (m.roleId ? [m.roleId] : []);
          return mr.some(rid => deptRoleIds.includes(rid));
        });
        if (this.currentRole !== "all") {
          result = result.filter(m => {
            const mr = m.roleIds || (m.roleId ? [m.roleId] : []);
            return mr.includes(this.currentRole);
          });
          if (this.currentSoftware !== "all" && this.currentSoftwares.length > 0) {
            result = result.filter(m =>
              m.software === this.currentSoftware ||
              (m.softwares && m.softwares.includes(this.currentSoftware))
            );
          }
        }
      }
      return result.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    },

    async init() {
      this.loading = true;
      this.error = null;
      try {
        await Promise.all([Alpine.store("config").load(), Alpine.store("uiText").load()]);
        this.config = Alpine.store("config").data;
        this.uiText = Alpine.store("uiText");
        if (this.config.site?.title) document.title = this.config.site.title;
        if (this.config.site?.description) {
          const m = document.querySelector('meta[name="description"]');
          if (m) m.content = this.config.site.description;
        }
        const [deptRes, membersRes] = await Promise.all([
          fetch("data/roles.json"),
          fetch("data/members.json")
        ]);
        if (!deptRes.ok) throw new Error(`${this.uiText.errors.loadDept}: ${deptRes.status}`);
        if (!membersRes.ok) throw new Error(`${this.uiText.errors.loadMember}: ${membersRes.status}`);
        this.departments = await deptRes.json();
        const membersData = await membersRes.json();
        // 初始化每个成员的展开状态
        this.members = membersData
          .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
          .map(m => ({ ...m, showFullBio: false }));
        console.log("✅ 数据加载成功:", { departments: this.departments.length, members: this.members.length });
      } catch (err) {
        console.error("❌ 数据加载失败:", err);
        this.error = err.message;
        this.departments = [];
        this.members = [];
      } finally {
        this.loading = false;
      }
    },

    async copyToClipboard(text, type) {
      const msgs = {
        wechat: this.uiText.toast.wechatCopied,
        email: this.uiText.toast.emailCopied
      };
      const ok = msgs[type] || this.uiText.toast.linkCopied;
      const fail = this.uiText.toast.copyFailed;
      try {
        await navigator.clipboard.writeText(text);
        Alpine.store("toast").show(ok);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); Alpine.store("toast").show(ok); }
        catch { Alpine.store("toast").show(fail); }
        document.body.removeChild(ta);
      }
    },

    handleAvatarClick(member) {
      if (!member.homepages || member.homepages.length === 0) {
        Alpine.store("toast").show(this.uiText.toast.noHomepage);
        return;
      }
      if (member.homepages.length === 1) {
        const url = member.homepages[0].url;
        const wl = Alpine.store("config").whitelist || DEFAULT_WHITELIST;
        if (isWechat() && !isWhitelist(url, wl)) Alpine.store("wechatModal").open(url);
        else window.open(url, "_blank");
      } else {
        Alpine.store("homepageModal").open(member.homepages, member.name, member.avatar);
      }
    },

    selectDepartment(id) { this.currentDepartment = id; this.currentRole = "all"; this.currentSoftware = "all"; },
    selectRole(id) { this.currentRole = id; this.currentSoftware = "all"; },
    selectSoftware(id) { this.currentSoftware = id; },

    getCurrentRoleColor() {
      if (this.currentRole === "all") return "#7AA2F7";
      const role = this.currentRoles.find(r => r.id === this.currentRole);
      return role ? role.color : "#7AA2F7";
    },

    getRoleColor(roleId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        const role = dept.roles.find(r => r.id === roleId);
        if (role) return role.color;
      }
      return "#7AA2F7";
    },

    getRoleName(roleId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        const role = dept.roles.find(r => r.id === roleId);
        if (role) return role.name;
      }
      return "未知";
    },

    getSoftwareName(swId) {
      for (const dept of this.departments) {
        if (!dept.roles) continue;
        for (const role of dept.roles) {
          if (!role.softwares) continue;
          const sw = role.softwares.find(s => s.id === swId);
          if (sw) return sw.name;
        }
      }
      return swId.toUpperCase();
    },

    // 工具函数引入
    parseBio,
    isBioLong,
  };
}

// 图片懒加载
if ("IntersectionObserver" in window) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: "50px 0px" });
  document.querySelectorAll('img[loading="lazy"]').forEach(img => obs.observe(img));
}

if (isWechat()) document.documentElement.classList.add("wechat-ua");
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});