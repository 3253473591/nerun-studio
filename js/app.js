function isWechat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function isWhitelist(url) {
  const whitelist = [
    "mp.weixin.qq.com",
    "m.tb.cn",
    "jd.com",
    "taobao.com",
    "tmall.com",
    "weibo.com",
    "qq.com",
  ];
  try {
    const urlObj = new URL(url);
    return whitelist.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

function parseBio(text) {
  if (!text) return "";
  const escapeHtml = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };
  let parsed = escapeHtml(text);
  parsed = parsed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, \'$2\')">$1</a>',
  );
  const urlRegex = /(https?:\/\/[^\s<]+)(?![^<]*<\/a>)/g;
  parsed = parsed.replace(urlRegex, (url) => {
    if (parsed.indexOf(`href="${url}"`) > -1) return url;
    return `<a href="${url}" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, '${url}')">${url}</a>`;
  });
  parsed = parsed.replace(/\n/g, "<br>");
  return parsed;
}

window.handleLinkClick = function (event, url) {
  if (isWechat() && !isWhitelist(url)) {
    event.preventDefault();
    Alpine.store("wechatModal").open(url);
    return false;
  }
  return true;
};

document.addEventListener("alpine:init", () => {
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
      try {
        await navigator.clipboard.writeText(this.url);
        Alpine.store("toast").show("链接已复制到剪贴板");
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = this.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          Alpine.store("toast").show("链接已复制到剪贴板");
        } catch {
          Alpine.store("toast").show("复制失败，请手动复制");
        }
        document.body.removeChild(textarea);
      }
    },
  });

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

  Alpine.store("homepageModal", {
    isOpen: false,
    memberName: "",
    links: [],
    open(links, memberName) {
      if (!links || links.length === 0) {
        Alpine.store("toast").show("该成员暂无主页链接");
        return;
      }
      this.links = links;
      this.memberName = memberName;
      this.isOpen = true;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.isOpen = false;
      this.links = [];
      this.memberName = "";
      document.body.style.overflow = "";
    },
    navigate(url) {
      if (isWechat() && !isWhitelist(url)) {
        Alpine.store("wechatModal").open(url);
        this.close();
      } else {
        window.open(url, "_blank");
        this.close();
      }
    }
  });
});

function studioApp() {
  return {
    roles: [],
    members: [],
    currentRole: "all",
    currentSubRole: "all",
    loading: true,
    error: null,

    get currentSubRoles() {
      const role = this.roles.find((r) => r.id === this.currentRole);
      return role && role.subRoles ? role.subRoles : [];
    },

    get filteredMembers() {
      let result = [];

      if (this.currentRole === "all") {
        result = this.members;
      } else {
        result = this.members.filter((m) => {
          if (m.roleIds && Array.isArray(m.roleIds)) {
            return m.roleIds.includes(this.currentRole);
          }
          if (m.roleId) {
            return m.roleId === this.currentRole;
          }
          return false;
        });

        if (this.currentSubRole !== "all" && this.currentSubRoles.length > 0) {
          result = result.filter((m) => {
            if (m.software === this.currentSubRole) return true;
            if (m.softwares && m.softwares.includes(this.currentSubRole))
              return true;
            return false;
          });
        }
      }

      return result.sort((a, b) => 
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      );
    },

    async init() {
      this.loading = true;
      this.error = null;

      try {
        const [rolesRes, membersRes] = await Promise.all([
          fetch("data/roles.json"),
          fetch("data/members.json"),
        ]);

        if (!rolesRes.ok)
          throw new Error(`加载工种数据失败: ${rolesRes.status}`);
        if (!membersRes.ok)
          throw new Error(`加载成员数据失败: ${membersRes.status}`);

        const rolesData = await rolesRes.json();
        const membersData = await membersRes.json();

        this.roles = rolesData.sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        );
        
        this.members = membersData.sort(
          (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
        );

        console.log("✅ 数据加载成功:", {
          roles: this.roles.length,
          members: this.members.length,
        });
      } catch (err) {
        console.error("❌ 数据加载失败:", err);
        this.error = err.message;
        this.loadDefaultData();
      } finally {
        this.loading = false;
      }
    },

    loadDefaultData() {
      this.roles = [
        { id: "arrangement", name: "编曲", color: "#BB9AF7", sortOrder: 1 },
        { id: "mixing", name: "混音", color: "#7AA2F7", sortOrder: 2 },
        { id: "vocal", name: "唱见", color: "#F7768E", sortOrder: 3 },
        {
          id: "tuning",
          name: "调校",
          color: "#F38BA8",
          sortOrder: 4,
          subRoles: [
            { id: "ace", name: "ACE Studio", color: "#FF6B6B" },
            { id: "cevio", name: "CeVIO", color: "#4ECDC4" },
            { id: "sv", name: "Synthesizer V", color: "#96CEB4" },
            { id: "vocaloid", name: "Vocaloid", color: "#DDA0DD" },
          ],
        },
        { id: "lyrics", name: "作词", color: "#9ECE6A", sortOrder: 5 },
      ];

      this.members = [
        {
          id: "demo_001",
          name: "示例成员",
          roleIds: ["arrangement"],
          avatar:
            "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23BB9AF7%22/%3E%3Ctext x=%2240%22 y=%2245%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22%3EA%3C/text%3E%3C/svg%3E",
          bio: "示例数据，请检查 members.json 路径。",
          sortOrder: 1,
        },
      ];
    },

    handleAvatarClick(member) {
      if (!member.homepages || member.homepages.length === 0) {
        Alpine.store("toast").show("该成员暂无主页链接");
        return;
      }
      
      if (member.homepages.length === 1) {
        const url = member.homepages[0].url;
        if (isWechat() && !isWhitelist(url)) {
          Alpine.store("wechatModal").open(url);
        } else {
          window.open(url, "_blank");
        }
      } else {
        Alpine.store("homepageModal").open(member.homepages, member.name);
      }
    },

    selectRole(roleId) {
      this.currentRole = roleId;
      this.currentSubRole = "all";
    },

    selectSubRole(subRoleId) {
      this.currentSubRole = subRoleId;
    },

    getCurrentRoleColor() {
      const role = this.roles.find((r) => r.id === this.currentRole);
      return role ? role.color : "#7AA2F7";
    },

    getRoleColor(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      return role ? role.color : "#7AA2F7";
    },

    getRoleName(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      return role ? role.name : "未知";
    },

    getSoftwareName(softwareId) {
      const allSubRoles = this.roles.flatMap((r) => r.subRoles || []);
      const subRole = allSubRoles.find((sr) => sr.id === softwareId);
      return subRole ? subRole.name : softwareId.toUpperCase();
    },

    parseBio,
  };
}

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

if (isWechat()) {
  document.documentElement.classList.add("wechat-ua");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}