import { config } from '../config.js';

const EFFECTIVE_DATE_ISO = '2026-08-27';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function contactDetails(locale) {
  const operator = esc(config.legal.operatorName || 'Appointment Lite');
  const email = String(config.legal.supportEmail || '').trim();
  if (email) {
    const safeEmail = esc(email);
    return locale === 'zh-cn'
      ? `<strong>${operator}</strong><p>联系邮箱：<a href="mailto:${safeEmail}">${safeEmail}</a></p>`
      : `<strong>${operator}</strong><p>Email: <a href="mailto:${safeEmail}">${safeEmail}</a></p>`;
  }
  return locale === 'zh-cn'
    ? `<strong>${operator}</strong><p>如需支持或数据删除，请通过 SHOPLINE App Store 中 Appointment Lite 的官方支持联系方式联系我们。</p>`
    : `<strong>${operator}</strong><p>For support or data deletion requests, please use the official Appointment Lite support contact listed in the SHOPLINE App Store.</p>`;
}

function calendarIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9h15M6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v9.4a2.8 2.8 0 0 1-2.8 2.8H6.8A2.8 2.8 0 0 1 4 17.2V7.8A2.8 2.8 0 0 1 6.8 5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function localizedPublicPath(locale, type) {
  if (type === 'home') return locale === 'en' ? '/' : `/${locale}`;
  return `/${locale}/${type}`;
}

function legalShell({ locale, type, title, lead, body }) {
  const zh = locale === 'zh-cn';
  const homeHref = localizedPublicPath(locale, 'home');
  const privacyHref = localizedPublicPath(locale, 'privacy');
  const termsHref = localizedPublicPath(locale, 'terms');
  const faqHref = localizedPublicPath(locale, 'faq');
  const alternateLocale = zh ? 'en' : 'zh-cn';
  const alternateHref = localizedPublicPath(alternateLocale, type);
  const alternateLabel = zh ? 'English' : '简体中文';
  const description = esc(lead);
  const pageTitle = type === 'home' ? `Appointment Lite · ${esc(title)}` : `${esc(title)} · Appointment Lite`;
  const currentPath = localizedPublicPath(locale, type);
  const canonical = `${config.appUrl}${currentPath}`;
  const alternateZh = `${config.appUrl}${localizedPublicPath('zh-cn', type)}`;
  const alternateEn = `${config.appUrl}${localizedPublicPath('en', type)}`;
  return `<!doctype html>
<html lang="${zh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Appointment Lite">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${esc(canonical)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="alternate" hreflang="zh-CN" href="${esc(alternateZh)}">
  <link rel="alternate" hreflang="en" href="${esc(alternateEn)}">
  <link rel="alternate" hreflang="x-default" href="${esc(`${config.appUrl}/`)}">
  <link rel="stylesheet" href="/legal/assets/styles.css?v=0.8.12">
  <title>${pageTitle}</title>
</head>
<body>
<div class="legal-shell ${type === 'home' ? 'home-shell' : ''}">
  <header class="legal-topbar">
    <div class="legal-topbar-inner">
      <a class="brand" href="${homeHref}" aria-label="Appointment Lite">
        <span class="brand-mark">${calendarIcon()}</span><span>Appointment Lite</span>
      </a>
      <nav class="legal-nav" aria-label="${zh ? '页面导航' : 'Page navigation'}">
        <a href="${homeHref}" class="${type === 'home' ? 'active' : ''}">${zh ? '首页' : 'Home'}</a>
        <a href="${privacyHref}" class="${type === 'privacy' ? 'active' : ''}">${zh ? '隐私政策' : 'Privacy'}</a>
        <a href="${termsHref}" class="${type === 'terms' ? 'active' : ''}">${zh ? '服务条款' : 'Terms'}</a>
        <a href="${faqHref}" class="${type === 'faq' ? 'active' : ''}">FAQ</a>
        <a class="lang" href="${alternateHref}">${alternateLabel}</a>
      </nav>
    </div>
  </header>
  ${body}
  <footer class="legal-footer"><div class="legal-footer-inner"><span>© 2026 Appointment Lite</span><span class="footer-links"><a href="${privacyHref}">${zh ? '隐私政策' : 'Privacy'}</a><a href="${termsHref}">${zh ? '服务条款' : 'Terms'}</a><a href="${faqHref}">FAQ</a></span><span>${zh ? '面向 SHOPLINE 商家的预约与服务管理应用' : 'Scheduling and service management for SHOPLINE merchants'}</span></div></footer>
</div>
${type === 'faq' ? '<script src="/legal/assets/faq.js?v=0.8.12" defer></script>' : ''}
</body>
</html>`;
}

const privacyZh = `
<main class="legal-main">
  <div class="legal-hero">
    <p class="eyebrow">Appointment Lite · Legal</p>
    <h1>隐私政策</h1>
    <p class="lead">本政策说明 SHOPLINE 商家安装、授权和使用 Appointment Lite，以及客户通过商家店铺使用预约功能时，我们可能处理的信息及其用途。</p>
    <div class="meta"><span><strong>生效日期</strong>：2026 年 8 月 27 日</span><span><strong>最后更新</strong>：2026 年 8 月 27 日</span></div>
  </div>
  <article class="legal-card privacy-card">
    <p>Appointment Lite（以下简称“本应用”）重视商家及其客户的隐私和个人信息安全。安装或使用 Appointment Lite 即表示您已阅读并理解本隐私政策。</p>

    <section><h2>1. 我们是谁</h2>
      <p>Appointment Lite 是一款为 SHOPLINE 商家提供预约和服务管理功能的应用，可帮助商家创建和管理商品预约、独立预约、付费预约、购买后预约、员工排班、服务地点、预约通知和 Google Calendar 日历同步等功能。</p>
      <div class="contact-box">${contactDetails('zh-cn')}</div>
    </section>

    <section><h2>2. 我们可能收集和处理的信息</h2>
      <h3>2.1 SHOPLINE 店铺信息</h3><p>当商家安装并授权 Appointment Lite 时，我们可能通过 SHOPLINE 提供的接口获取店铺名称、SHOPLINE 店铺 ID、店铺域名、店铺语言、店铺时区、市场或店铺基础配置、应用授权状态以及应用运行所需的授权信息。</p><p>这些信息主要用于识别商家店铺、加载正确的预约配置，以及维持应用正常运行。</p>
      <h3>2.2 SHOPLINE 商品信息</h3><p>当商家将预约服务与 SHOPLINE 商品关联时，我们可能读取商品 ID、商品名称、Variant / SKU 相关标识、商品状态，以及建立预约服务关联所需的其他基础商品信息。</p>
      <h3>2.3 SHOPLINE 订单信息</h3><p>对于涉及付款、商品购买或“先购买后预约”的服务，我们可能根据商家的授权读取与预约相关的订单信息，包括 SHOPLINE 订单 ID、订单状态、付款状态、下单时间、客户姓名、客户邮箱、相关订单行项目、预约关联信息，以及在相关服务需要时的配送地址或客户地址。</p><p>这些数据用于确认预约资格、同步订单生命周期、判断付款状态，以及将预约与对应的 SHOPLINE 订单关联。Appointment Lite 不会因为正常预约功能而修改或删除商家的 SHOPLINE 订单。</p>
      <h3>2.4 客户预约信息</h3><p>客户提交预约时，我们可能处理客户姓名、邮箱、电话号码（如商家启用）、客户留言（如商家启用）、服务地址（如服务要求）、所选服务、日期和时间、时区、员工、地点、预约状态、付款及订单关联状态，以及预约创建、修改、取消等操作记录。</p>
      <h3>2.5 员工信息</h3><p>如果商家使用员工管理功能，我们可能处理员工姓名、员工邮箱、头像、工作时间、特殊排班、服务分配关系和通知设置，用于计算员工可用时间、分配预约和发送预约通知。</p>
      <h3>2.6 服务地点信息</h3><p>当商家使用 SHOPLINE Location 或自定义地点时，我们可能处理 SHOPLINE Location ID、地点名称、地址以及商家为预约服务选择的地点配置。</p>
      <h3>2.7 Google Calendar 信息</h3><p>如果商家主动连接 Google Calendar，Appointment Lite 可能请求创建和维护预约日历事件所需的权限，并处理 Google 授权信息、Calendar 标识、维持授权连接所需的凭证、与预约对应的 Calendar Event ID 和同步状态。</p><p>Google Calendar 权限仅用于商家主动启用的预约日历同步，不用于广告或与预约服务无关的用途。商家可以在应用内断开连接，或通过 Google Account 权限管理页面撤销授权。</p>
    </section>

    <section><h2>3. 我们如何使用信息</h2><p>我们可能将信息用于：</p><ul><li>提供和运行 Appointment Lite；</li><li>创建和管理预约服务以及可预约日期和时间；</li><li>管理员工排班和服务地点；</li><li>将预约与 SHOPLINE 商品及订单关联，并判断订单和付款状态；</li><li>管理购买后预约资格；</li><li>向客户、商家或员工发送预约确认、更新、取消、提醒及购买后预约链接；</li><li>创建、更新或删除 Google Calendar 预约事件；</li><li>显示预约记录及订单生命周期；</li><li>防止重复预约和时间冲突；</li><li>提供客户预约修改或取消功能；</li><li>排查错误、保障应用稳定性并防止欺诈、滥用或未经授权访问；</li><li>响应商家的支持请求。</li></ul><p>我们不会出售客户或商家的个人信息。</p></section>

    <section><h2>4. 邮件通知</h2><p>Appointment Lite 可以代表商家发送与预约相关的事务性邮件，包括预约确认、预约修改、预约取消、预约提醒、员工分配通知和购买后预约链接。</p><p>这些邮件仅用于预约服务及相关客户沟通。我们不会使用预约客户的邮箱地址发送与 Appointment Lite 服务无关的营销邮件，除非获得适用法律要求的额外授权。</p></section>

    <section><h2>5. 数据共享</h2><p>我们不会出售、出租或交易商家或客户的个人信息。为提供 Appointment Lite 服务，我们可能在必要范围内与以下类别的服务提供商处理数据：</p><ul><li>SHOPLINE；</li><li>云托管服务提供商；</li><li>数据库服务提供商；</li><li>事务性邮件服务提供商；</li><li>Google Calendar / Google OAuth；</li><li>错误监控、安全和基础设施服务提供商。</li></ul><p>这些服务提供商仅在提供相关技术服务所需范围内处理数据。我们也可能在法律、法院命令或监管要求适用时披露必要信息。</p></section>

    <section><h2>6. 数据存储和安全</h2><p>我们采取合理的技术和组织措施保护数据，包括安全存储敏感授权信息、限制应用访问权限、使用 HTTPS 传输数据、对重要接口进行身份和权限验证、限制不必要的数据访问，以及记录必要的系统和安全事件。</p><p>但是，任何互联网传输或电子存储系统都无法保证绝对安全。</p></section>

    <section><h2>7. 数据保留</h2><p>我们仅在提供 Appointment Lite 服务、解决争议、满足安全要求和履行法律义务所需的合理期限内保留数据。不同类型数据的保留时间可能不同。</p><p>为保证预约历史、订单关联、纠纷处理和运营记录的完整性，部分历史预约信息可能不会在预约完成后立即删除。商家可以通过官方支持渠道申请删除适用的数据。</p></section>

    <section><h2>8. 应用卸载</h2><p>商家从 SHOPLINE 卸载 Appointment Lite 后：</p><ul><li>Appointment Lite 将无法继续通过该店铺此前的有效授权访问新的 SHOPLINE 数据；</li><li>店铺前端的 Appointment Lite 预约功能将停止工作；</li><li>Google Calendar 等外部连接可能被停用或失效；</li><li>已存储的历史预约或必要运营记录可能在合理期限内继续保留，用于数据恢复、安全、争议处理或法律义务。</li></ul><p>商家可通过本页面底部所列支持方式申请删除与店铺相关的适用数据。</p></section>

    <section><h2>9. 客户的数据权利</h2><p>根据客户所在地区适用的隐私法律，客户可能拥有查询、更正、删除、限制处理、获取可携带副本、撤回同意或对特定处理提出异议等权利。</p><p>客户可以首先联系其进行预约的 SHOPLINE 商家；如请求涉及 Appointment Lite 直接处理的数据，也可以通过本页面提供的官方支持方式联系我们。</p></section>

    <section><h2>10. 商家的责任</h2><p>使用 Appointment Lite 的 SHOPLINE 商家通常决定如何收集和使用其客户的预约信息。商家应根据适用法律提供店铺隐私政策、告知客户预约所需信息、仅收集业务实际需要的数据、合法使用客户的预约及联系方式，并配置符合其业务需要的预约字段和通知设置。</p><p>Appointment Lite 提供预约技术工具，但不会替代商家自身应承担的隐私和合规责任。</p></section>

    <section><h2>11. 儿童隐私</h2><p>Appointment Lite 并非专门面向儿童设计。商家应根据其业务类型和所在地法律判断是否允许未成年人预约服务，并在必要时获得父母或监护人的同意。</p></section>

    <section><h2>12. 跨境数据处理</h2><p>根据商家、客户及我们使用的基础设施所在地区，数据可能在客户所在地以外的国家或地区进行处理。在适用的情况下，我们会采取合理措施保护跨境处理的数据。</p></section>

    <section><h2>13. 本政策的更新</h2><p>我们可能随着 Appointment Lite 功能、法律要求或数据处理方式的变化更新本隐私政策。更新后的版本将在本页面公布，并更新“最后更新”日期。如变更对用户的数据权益产生重大影响，我们可能采取额外方式通知商家。</p></section>

    <section><h2>14. 联系我们</h2><p>如果您对本隐私政策、Appointment Lite 的数据处理方式或数据删除请求有任何疑问，请通过以下方式联系我们：</p><div class="contact-box">${contactDetails('zh-cn')}</div></section>
  </article>
</main>`;

const privacyEn = `
<main class="legal-main">
  <div class="legal-hero">
    <p class="eyebrow">Appointment Lite · Legal</p>
    <h1>Privacy Policy</h1>
    <p class="lead">This policy explains the information Appointment Lite may process when SHOPLINE merchants install and use the App and when customers use booking features on a merchant storefront.</p>
    <div class="meta"><span><strong>Effective date</strong>: August 27, 2026</span><span><strong>Last updated</strong>: August 27, 2026</span></div>
  </div>
  <article class="legal-card privacy-card">
    <p>Appointment Lite (“Appointment Lite”, “the App”, “we”, “us”, or “our”) respects the privacy and security of SHOPLINE merchants and their customers. By installing or using Appointment Lite, you acknowledge that you have read and understood this Privacy Policy.</p>

    <section><h2>1. Who We Are</h2><p>Appointment Lite is a scheduling and service management application for SHOPLINE merchants. It enables product appointments, standalone bookings, paid bookings, post-purchase scheduling, staff availability, service locations, notifications, and Google Calendar synchronization.</p><div class="contact-box">${contactDetails('en')}</div></section>

    <section><h2>2. Information We May Process</h2>
      <h3>2.1 SHOPLINE Store Information</h3><p>When a merchant installs and authorizes Appointment Lite, we may receive the store name, SHOPLINE store ID, store domain, language, timezone, market or basic store configuration, app authorization status, and authorization information necessary to operate the App.</p><p>We use this information to identify the merchant store, load the appropriate booking configuration, and operate Appointment Lite.</p>
      <h3>2.2 SHOPLINE Product Information</h3><p>When a merchant connects an appointment service to a SHOPLINE product, we may process product IDs, product titles, variant or SKU identifiers, product status, and other basic product information required to maintain the service relationship.</p>
      <h3>2.3 SHOPLINE Order Information</h3><p>For services involving purchases, payments, or post-purchase scheduling, we may process authorized order information including SHOPLINE order ID, order status, payment status, order creation time, customer name, customer email, relevant line items, appointment-related metadata, and shipping or customer address when required by the service.</p><p>This information is used to determine booking eligibility, synchronize order lifecycle status, verify payment status, and associate appointments with the appropriate SHOPLINE order. Appointment Lite does not modify or delete SHOPLINE orders as part of normal appointment functionality.</p>
      <h3>2.4 Customer Booking Information</h3><p>When a customer submits a booking, we may process name, email address, phone number when enabled, customer notes when enabled, service address when required, selected service, appointment date and time, timezone, staff member, service location, booking status, payment and order relationship status, and booking creation, rescheduling, cancellation, or related activity.</p>
      <h3>2.5 Staff Information</h3><p>If a merchant uses staff management, we may process staff names, email addresses, avatars, working hours, special availability, service assignments, and notification preferences to calculate availability, assign appointments, and send booking notifications.</p>
      <h3>2.6 Location Information</h3><p>When SHOPLINE Locations or custom locations are used, we may process SHOPLINE Location IDs, location names, addresses, and the location configuration selected for an appointment service.</p>
      <h3>2.7 Google Calendar Information</h3><p>If a merchant chooses to connect Google Calendar, Appointment Lite may request the permissions needed to create and maintain booking events and may process Google authorization information, calendar identifiers, credentials needed to maintain the authorized connection, Calendar Event IDs associated with appointments, and synchronization status.</p><p>Google Calendar access is used only for calendar synchronization requested by the merchant, not for advertising or unrelated purposes. Merchants can disconnect Google Calendar in Appointment Lite or revoke access through their Google Account settings.</p>
    </section>

    <section><h2>3. How We Use Information</h2><p>We may use information to:</p><ul><li>Provide and operate Appointment Lite;</li><li>Create and manage appointment services and available dates and times;</li><li>Manage staff schedules and service locations;</li><li>Associate bookings with SHOPLINE products and orders and determine order or payment status;</li><li>Manage post-purchase booking eligibility;</li><li>Send booking confirmations, updates, cancellations, reminders, staff notices, and private post-purchase booking links;</li><li>Create, update, or remove Google Calendar events;</li><li>Display booking records and order lifecycle information;</li><li>Prevent duplicate appointments and scheduling conflicts;</li><li>Provide rescheduling and cancellation functionality;</li><li>Diagnose errors, maintain reliability, and prevent fraud, abuse, or unauthorized access;</li><li>Respond to merchant support requests.</li></ul><p>We do not sell merchant or customer personal information.</p></section>

    <section><h2>4. Booking Emails</h2><p>Appointment Lite may send transactional emails on behalf of merchants, including booking confirmations, updates, cancellation notifications, appointment reminders, staff assignment notifications, and private post-purchase scheduling links.</p><p>These communications are used only to provide appointment-related services. Appointment Lite does not use customer booking email addresses for unrelated marketing communications unless separately authorized as required by applicable law.</p></section>

    <section><h2>5. Sharing of Information</h2><p>We do not sell, rent, or trade merchant or customer personal information. To operate Appointment Lite, information may be processed by service providers in categories including:</p><ul><li>SHOPLINE;</li><li>Cloud hosting providers;</li><li>Database infrastructure providers;</li><li>Transactional email providers;</li><li>Google Calendar and Google OAuth;</li><li>Security, monitoring, and infrastructure providers.</li></ul><p>These providers process information only as necessary to deliver their services. We may also disclose information when required by applicable law, a valid legal request, court order, or regulatory obligation.</p></section>

    <section><h2>6. Data Security</h2><p>We use reasonable technical and organizational safeguards designed to protect information, including secure storage of sensitive authorization information, access controls, HTTPS encryption in transit, authentication and authorization for protected operations, limiting unnecessary access, and security or operational logging where appropriate.</p><p>However, no Internet transmission or electronic storage system can be guaranteed to be completely secure.</p></section>

    <section><h2>7. Data Retention</h2><p>We retain information only for as long as reasonably necessary to provide Appointment Lite, resolve disputes, maintain security, and comply with applicable legal obligations. Retention periods may vary by data type.</p><p>Certain historical booking and order-related records may be retained after an appointment is completed to preserve operational history, resolve disputes, and maintain service integrity. Merchants may contact us to request deletion of applicable stored data.</p></section>

    <section><h2>8. App Uninstallation</h2><p>When a merchant uninstalls Appointment Lite from SHOPLINE:</p><ul><li>Appointment Lite will no longer be able to use the store's previous active authorization to access new SHOPLINE information;</li><li>Appointment Lite storefront booking functionality will stop operating;</li><li>External connections such as Google Calendar may be disabled or become inactive;</li><li>Certain historical booking or operational records may remain for a reasonable period for recovery, security, dispute resolution, or legal purposes.</li></ul><p>Merchants may request deletion of applicable data associated with their store through the official support contact shown on this page.</p></section>

    <section><h2>9. Privacy Rights</h2><p>Depending on applicable privacy laws, individuals may have rights to request access, correct inaccurate information, request deletion, restrict certain processing, obtain a portable copy of applicable data, withdraw consent, or object to certain processing.</p><p>Customers should generally contact the SHOPLINE merchant with whom they made the booking first. For requests involving information processed directly by Appointment Lite, use the official support contact shown on this page.</p></section>

    <section><h2>10. Merchant Responsibilities</h2><p>SHOPLINE merchants using Appointment Lite generally determine how customer booking information is collected and used. Merchants are responsible for complying with applicable privacy laws, maintaining an appropriate store privacy policy, informing customers what booking information is collected, collecting only information reasonably necessary for their services, lawfully using customer contact and appointment information, and configuring booking fields and notifications appropriately.</p><p>Appointment Lite provides scheduling technology but does not replace a merchant's own privacy and compliance obligations.</p></section>

    <section><h2>11. Children's Privacy</h2><p>Appointment Lite is not specifically designed for children. Merchants are responsible for determining whether minors may use their services and obtaining parental or guardian consent where required by applicable law.</p></section>

    <section><h2>12. International Data Processing</h2><p>Depending on the locations of merchants, customers, and service infrastructure, information may be processed in countries or regions outside the customer's jurisdiction. Where applicable, reasonable safeguards are used to protect information processed internationally.</p></section>

    <section><h2>13. Changes to This Policy</h2><p>We may update this Privacy Policy to reflect changes to Appointment Lite, legal requirements, or our data processing practices. The updated policy will be published on this page with a revised “Last updated” date. If a change materially affects users' privacy rights, we may provide additional notice to merchants where appropriate.</p></section>

    <section><h2>14. Contact Us</h2><p>For questions about this Privacy Policy, Appointment Lite's data practices, or data deletion requests, please contact us through the following official support channel:</p><div class="contact-box">${contactDetails('en')}</div></section>
  </article>
</main>`;

const faqZh = [
  ['开始使用', [
    ['Appointment Lite 是什么？','Appointment Lite 是一款面向 SHOPLINE 商家的在线预约和服务管理应用。它可以帮助商家创建预约服务、设置可预约时间、管理员工排班和服务地点，并通过 SHOPLINE 商品、订单、邮件通知及 Google Calendar 将商品销售和服务预约连接起来。'],
    ['Appointment Lite 适合哪些业务？','适用于需要客户选择服务日期或时间的业务，例如课程和培训、咨询服务、美容和护理、安装服务、上门服务、到店服务、维修、摄影与活动预约、商品购买后的服务预约，以及其他按日期或时间提供的服务。'],
    ['我可以创建不关联商品的预约吗？','可以。Appointment Lite 支持独立预约服务，客户可以通过专属预约页面选择时间，无需先购买 SHOPLINE 商品。'],
    ['可以把预约与 SHOPLINE 商品关联吗？','可以。商家可以将预约服务关联到 SHOPLINE 商品，使客户从对应商品进入预约流程，适合课程、体验、安装或其他同时具有商品和服务属性的业务。']
  ]],
  ['预约方式与订单', [
    ['Appointment Lite 支持哪些预约和购买方式？','根据服务场景，可以使用直接预约无需付款、选择预约时间后完成购买或付款、SHOPLINE 商品与预约同时使用，以及客户先完成 SHOPLINE 订单再通过专属链接选择预约时间等流程。具体行为取决于服务配置。'],
    ['什么是“先购买，后预约”？','该模式适用于客户必须先购买商品或服务，然后才能选择预约时间的业务。符合条件的 SHOPLINE 订单创建并满足要求后，Appointment Lite 可以生成与订单关联的预约资格，并根据商家的通知设置提供私密预约入口。付款状态和预约状态会分别跟踪。'],
    ['一个订单可以预约多少次？','购买后预约可以根据符合条件的商品数量和服务配置生成预约资格。例如商家设置每购买一件对应商品可预约一次时，购买多件商品可以获得对应数量的预约次数。'],
    ['付款状态和预约状态有什么区别？','它们代表两个独立生命周期。例如客户可能已经付款但尚未选择预约时间，也可能预约的是无需付款的服务。Appointment Lite 会分别显示付款进度和预约进度。'],
    ['什么是“待预约”？','通常表示客户已经具备预约资格，但尚未完成日期和时间选择，例如客户已完成“先购买后预约”的订单，但还没有使用私密预约入口。'],
    ['什么是“需要处理”？','表示系统检测到该订单或预约存在需要商家关注的状态。建议查看预约动态和相关 SHOPLINE 订单信息确认下一步操作。'],
    ['在 SHOPLINE 后台把订单改为已付款后，Appointment Lite 会更新吗？','Appointment Lite 会通过相关 SHOPLINE 订单事件以及订单状态同步机制更新付款和预约资格信息。部分更新可能需要短暂同步时间，如长时间未更新可刷新预约记录或联系技术支持。'],
    ['SHOPLINE 订单取消后会发生什么？','具体处理取决于订单和预约当前状态。Appointment Lite 会保留必要的生命周期信息，避免丢失历史记录。SHOPLINE 订单取消与 Appointment Lite 预约取消是相关但独立的状态。'],
    ['为什么有些预约记录可以打开 SHOPLINE 订单？','由 SHOPLINE 商品或订单产生的预约会保留必要的订单关联，商家可以从预约记录的操作菜单进入对应 SHOPLINE 订单。'],
    ['Appointment Lite 会修改 SHOPLINE 的 Add to cart 或 Buy now 吗？','Appointment Lite 会根据商家选择的预约方式与商品和订单建立必要关联，但设计目标是与 SHOPLINE 原有购买流程协作，而不是不必要地替换标准购买体验。商家应选择最适合其业务的预约流程。']
  ]],
  ['时间、员工与地点', [
    ['客户可以自己选择员工吗？','可以。商家可以配置员工分配方式。开启客户选择员工后，客户会先选择可用员工，系统再根据该员工和服务的排班显示可预约时间。'],
    ['如何设置员工工作时间？','进入 Appointment Lite 后台的“员工”页面，可以创建员工、设置常规工作时间、特殊日期排班、分配可提供的服务，以及配置员工通知。最终可预约时间会同时考虑员工和服务排班。'],
    ['为什么员工设置了特殊排班，但当天仍然没有可预约时间？','员工排班不会覆盖服务本身的营业时间。最终可预约时间必须同时满足服务可预约时间、员工可用时间、已有预约占用、服务缓冲时间和预约规则。如果服务当天关闭，仅增加员工工作时间不会自动开放服务。'],
    ['Appointment Lite 支持 SHOPLINE Location 吗？','支持。商家可以读取并选择 SHOPLINE 后台已有的 Location 作为预约服务地点，使地点维护和预约配置保持一致。'],
    ['我也可以设置自己的地点吗？','可以。除了 SHOPLINE Location，还可以根据服务类型使用客户地址、线上服务或自定义地点。对于上门服务，也可以要求客户填写服务地址。'],
    ['Appointment Lite 如何处理时区？','预约服务会保留服务时区。系统在计算可预约时间、员工排班、提醒和日历同步时使用该时区信息，即使客户和商家位于不同地区，也能按照正确的服务时间安排预约。'],
    ['可以限制客户提前多久预约吗？','可以。服务可配置最短提前预约时间、最长预约窗口、可预约日期、每周营业时间、特殊开放或关闭日期、服务时长、缓冲时间和容量。'],
    ['一个时间段可以接受多个客户吗？','可以。Appointment Lite 支持预约容量。例如课程可以允许多个客户预约同一时段，而一对一咨询可以将容量设置为 1。'],
    ['支持全天或多次课程预约吗？','支持。Appointment Lite 支持按分钟或小时的预约、全天预约以及需要选择多个时间段的服务。实际展示方式根据服务配置决定。'],
    ['为什么某一天没有可预约时间？','常见原因包括服务当天未开放、员工不可用、时段已被预约、达到容量、未满足最短提前预约时间、超出预约窗口、特殊日期关闭，或者服务时长和缓冲时间无法再容纳。建议同时检查服务排班和员工排班。']
  ]],
  ['前台预约体验', [
    ['客户预约时需要填写哪些信息？','核心预约通常需要姓名和邮箱。商家还可以开启电话、留言、服务地址、员工选择和地点相关信息。某些由服务本身要求的字段不能隐藏，以保证预约可以正常完成。'],
    ['可以隐藏 Phone 或留言字段吗？','可以。在“店铺前台设置 / Storefront Setup”中，可以控制 Phone、Notes、Service Summary、时区选择器和底部提示等非必要元素。'],
    ['可以修改商品页上的预约按钮吗？','可以。商家可以自定义按钮文案、背景颜色、文字颜色、宽度、对齐方式和圆角，使 Appointment Lite 更符合 SHOPLINE 主题风格。'],
    ['可以修改预约弹窗颜色吗？','可以。Storefront 自定义功能允许商家调整预约弹窗的主要强调色和主按钮样式，并控制支持的可选表单元素。'],
    ['为什么不能隐藏姓名、邮箱或预约时间？','这些属于完成预约所需的核心信息。Appointment Lite 允许商家控制非必要内容，同时保护创建有效预约必须的信息，避免配置出无法完成预约的表单。'],
    ['修改 Storefront 设置后为什么前台没有立即变化？','保存设置后请刷新商品页面。如果正在 SHOPLINE Theme Editor 中预览，也建议重新加载预览页面，以读取最新的 Appointment Lite 配置。'],
    ['为什么 Theme Editor 中看不到预约组件？','请确认 Appointment Lite 已正确安装和授权、当前主题支持相应 Theme App Extension、Appointment Lite App Block 已加入正确的商品模板，并且当前商品已经配置有效的预约服务。如仍无法看到，请联系技术支持。']
  ]],
  ['通知与日历', [
    ['客户预约后会收到邮件吗？','是否发送取决于商家的通知设置。可配置的客户通知包括预约确认、预约更新、预约取消和履约前提醒。购买后预约还可以向客户发送私密预约链接。'],
    ['员工会收到预约通知吗？','如果商家为员工启用了相应通知，Appointment Lite 可以在员工被分配预约、预约变更或取消时发送邮件。员工不需要登录 Google 账号即可收到普通邮件通知。'],
    ['可以修改邮件通知设置吗？','可以。在“邮件设计 / Email Studio”中，商家可以管理客户和商家通知，并配置预约提醒时间等选项。'],
    ['Appointment Lite 如何与 Google Calendar 工作？','商家可以连接一个 Business Google Calendar。连接后，Appointment Lite 可以根据预约生命周期创建、更新或删除相应日历事件，帮助商家统一查看业务日程。'],
    ['每个员工都需要连接自己的 Google Calendar 吗？','不需要。当前 Appointment Lite 使用商家的 Business Google Calendar 作为统一业务日历，不要求每位员工分别完成 Google OAuth 授权。'],
    ['客户必须使用 Gmail 才能预约吗？','不需要。客户可以使用正常的有效邮箱完成预约，不要求必须是 Gmail。Google Calendar 也不是完成预约的必要条件。'],
    ['客户可以把预约加入自己的 Google Calendar 吗？','在支持的预约完成页面中，客户可以使用 Google Calendar 操作将预约添加到自己的日历。是否使用该功能不会影响预约本身。']
  ]],
  ['预约记录与管理', [
    ['如何查看所有预约？','进入 Appointment Lite 后台的“预约记录”页面。商家可以查看客户与服务、预约安排、员工和地点、付款状态、预约状态、预约动态及可用管理操作。'],
    ['可以修改已经创建的预约吗？','可以。商家可以从预约记录的操作菜单执行当前状态允许的修改。客户也可以通过有效的预约管理入口执行支持的改期或取消操作。'],
    ['可以取消预约吗？','可以。取消后 Appointment Lite 会更新预约状态，并根据当前配置处理员工占用、Calendar 事件和通知。取消 Appointment Lite 预约不会自动等同于取消或退款 SHOPLINE 订单。'],
    ['可以删除预约记录吗？','可以。删除需要二次确认以防误操作。对仍有效的预约执行删除时，系统会根据记录类型处理相关预约占用。删除 Appointment Lite 预约记录不会删除对应 SHOPLINE 订单。']
  ]],
  ['隐私、卸载与支持', [
    ['卸载 Appointment Lite 后会发生什么？','卸载后，Appointment Lite 将无法继续使用该店铺此前的有效授权获取新的 SHOPLINE 数据，店铺前端预约入口也将停止正常工作。部分历史记录可能在合理期限内保留用于安全、恢复、争议处理或法律义务。'],
    ['如何删除我的店铺数据？','店铺所有者或获得授权的管理员可以通过 Appointment Lite 的官方支持渠道提交数据删除请求。请提供足以确认 SHOPLINE 店铺身份的信息，我们会在核实后按照适用政策处理。'],
    ['如何联系 Appointment Lite 支持？','如遇安装、预约、员工、地点、订单、Google Calendar 或通知问题，请使用 SHOPLINE App Store 中 Appointment Lite 的官方支持联系方式。建议提供店铺域名、问题发生时间、服务名称、相关预约或订单信息和截图。请勿通过普通支持渠道发送密码、完整支付卡信息或不必要的敏感数据。']
  ]]
];

const faqEn = [
  ['Getting started', [
    ['What is Appointment Lite?','Appointment Lite is an appointment scheduling and service management app for SHOPLINE merchants. It helps merchants create booking services, configure availability, manage staff and locations, and connect appointments with SHOPLINE products, orders, email notifications, and Google Calendar.'],
    ['What types of businesses can use Appointment Lite?','Appointment Lite can be used for classes and training, consultations, beauty and wellness services, installation services, home services, in-store appointments, repairs, photography and events, post-purchase services, and other time-based businesses.'],
    ['Can I create appointments without connecting a product?','Yes. Appointment Lite supports standalone services that customers can book through a dedicated booking experience without purchasing a SHOPLINE product first.'],
    ['Can I connect a booking service to a SHOPLINE product?','Yes. A booking service can be associated with a SHOPLINE product so customers can access the relevant scheduling experience from that product. This works well for classes, experiences, installations, and services sold together with products.']
  ]],
  ['Booking flows and orders', [
    ['What booking and purchase flows are supported?','Appointment Lite supports booking without payment, selecting an appointment before purchase or payment, product-related appointment flows, and purchasing through SHOPLINE first and scheduling afterwards through a private booking flow. Exact behavior depends on the service configuration.'],
    ['What is post-purchase scheduling?','Post-purchase scheduling is for services where customers must purchase before choosing an appointment time. After a qualifying SHOPLINE order is created and meets the required conditions, Appointment Lite can create order-linked booking eligibility and provide a private scheduling option according to the merchant notification settings. Payment and appointment progress are tracked separately.'],
    ['How many appointments can a customer make from one order?','Post-purchase booking eligibility can be based on qualifying product quantity and service configuration. For example, if a service allows one appointment for each purchased item, multiple eligible items can provide multiple booking opportunities.'],
    ['What is the difference between payment status and appointment status?','They represent separate lifecycles. A customer may have paid but not yet selected an appointment time, or an appointment may exist for a service that does not require payment. Appointment Lite therefore tracks payment progress separately from scheduling progress.'],
    ['What does “Awaiting booking” mean?','It generally means the customer is eligible to schedule but has not yet selected an appointment date and time, such as a completed post-purchase order where the private scheduling flow has not yet been used.'],
    ['What does “Needs attention” mean?','It indicates that the relevant order or booking has a state that may require merchant review. Check the booking activity and related SHOPLINE order information to determine the next action.'],
    ['Will Appointment Lite update if an order becomes paid in SHOPLINE?','Appointment Lite uses relevant SHOPLINE order events and order reconciliation mechanisms to update payment and booking eligibility information. Some updates may require a short synchronization period. If a status remains outdated, refresh the booking records or contact support.'],
    ['What happens if a SHOPLINE order is cancelled?','The result depends on the current state of both the order and the appointment. Appointment Lite preserves necessary lifecycle information so historical context is not lost. A SHOPLINE order cancellation and an Appointment Lite booking cancellation are related but separate events.'],
    ['Why can some booking records open a SHOPLINE order?','Bookings created from SHOPLINE products or orders can retain the necessary order relationship. Merchants can use the booking action menu to open the corresponding SHOPLINE order when available.'],
    ['Does Appointment Lite modify SHOPLINE Add to cart or Buy now?','Appointment Lite may connect scheduling with products and orders depending on the selected workflow, but it is designed to work with SHOPLINE existing commerce experience rather than unnecessarily replace standard purchase behavior. Choose the booking flow that best matches the intended customer journey.']
  ]],
  ['Scheduling, staff, and locations', [
    ['Can customers choose a staff member?','Yes. Merchants can configure how staff are assigned. When customer staff selection is enabled, customers choose an available team member before viewing applicable appointment times.'],
    ['How do I configure staff working hours?','Open the Staff section in Appointment Lite. You can create staff profiles, configure regular working hours, add special availability, assign staff to services, and configure notification preferences. Final availability uses both staff and service schedules.'],
    ['Why is a date unavailable even though the staff member has special working hours?','Staff availability does not override a closed service schedule. An available appointment must satisfy service availability, staff availability, existing reservations, buffer rules, and scheduling policies. If the service is closed that day, staff availability alone will not open it.'],
    ['Does Appointment Lite support SHOPLINE Locations?','Yes. Merchants can select locations already maintained in SHOPLINE and use them as service locations in Appointment Lite.'],
    ['Can I use locations other than SHOPLINE Locations?','Yes. Depending on the service, merchants can use a SHOPLINE Location, customer address, online service, or custom location. Home services can also require a customer service address.'],
    ['How does timezone handling work?','Appointment services preserve a defined service timezone. Appointment Lite uses timezone information when calculating availability, staff schedules, reminders, and calendar events so appointment times remain consistent across regions.'],
    ['Can I control how far in advance customers can book?','Yes. Services can configure minimum booking notice, maximum booking window, available date ranges, weekly working hours, special open or closed dates, service duration, buffer time, and booking capacity.'],
    ['Can multiple customers book the same time?','Yes. Appointment Lite supports booking capacity. A class may allow several customers to reserve the same session, while a one-to-one consultation can use a capacity of one.'],
    ['Are all-day or multi-session bookings supported?','Yes. Appointment Lite supports time-based appointments, all-day services, and services that require multiple sessions. The booking experience changes according to the service configuration.'],
    ['Why are there no available times on a particular date?','Common reasons include the service being closed, unavailable staff, existing bookings, reached capacity, minimum notice rules, a date outside the booking window, a special closure, or insufficient time for service duration and buffer. Check both the service and staff schedules.']
  ]],
  ['Storefront booking experience', [
    ['What information does a customer need to enter?','Core booking information normally includes name and email address. Merchants may also enable phone, notes, service address, staff selection, and location-related information. Some service-required fields cannot be hidden because they are necessary to complete the appointment.'],
    ['Can I hide the Phone or Notes fields?','Yes. In Storefront Setup, merchants can control optional elements such as Phone, Notes, Service Summary, the timezone selector, and footer guidance.'],
    ['Can I customize the booking button on my product page?','Yes. Merchants can customize button text, background color, text color, width, alignment, and border radius so the booking experience better matches the SHOPLINE theme.'],
    ['Can I customize the booking dialog?','Yes. Storefront customization allows merchants to adjust primary accent styling, primary button appearance, and the visibility of supported optional form elements.'],
    ['Why can’t I hide the name, email, or appointment time?','These are core pieces of information required to create and manage an appointment. Appointment Lite allows optional presentation elements to be customized while protecting information necessary for a valid booking.'],
    ['Why didn’t my storefront customization update immediately?','After saving Storefront settings, refresh the product page. When previewing inside the SHOPLINE Theme Editor, reloading the preview may also be necessary to retrieve the latest Appointment Lite configuration.'],
    ['Why can’t I see Appointment Lite in the Theme Editor?','Confirm that Appointment Lite is installed and authorized, the current theme supports the relevant Theme App Extension, the Appointment Lite App Block is added to the correct product template, and the product has a valid appointment service configuration. Contact support if the issue continues.']
  ]],
  ['Notifications and calendars', [
    ['Do customers receive booking emails?','This depends on the merchant notification settings. Customer communications can include booking confirmation, booking updates, cancellation notifications, and appointment reminders. Post-purchase scheduling can also send a private booking link.'],
    ['Can staff receive booking notifications?','Yes, when the merchant enables the relevant staff notifications. Appointment Lite can notify assigned staff about bookings and relevant changes. Staff do not need a Google account to receive normal email notifications.'],
    ['Can I configure notification emails?','Yes. Email Studio lets merchants manage customer and merchant notification options and configure settings such as pre-appointment reminder timing.'],
    ['How does Google Calendar integration work?','A merchant can connect a Business Google Calendar. Appointment Lite can then create, update, or remove calendar events as the related appointment changes, providing a centralized business calendar.'],
    ['Does every staff member need to connect Google Calendar?','No. Appointment Lite currently uses the merchant Business Google Calendar as the primary synchronized business calendar. Individual staff members do not need separate Google OAuth connections.'],
    ['Does a customer need a Gmail address to make a booking?','No. Customers can book using a valid email address and are not required to use Gmail. Google Calendar is not required to complete an appointment.'],
    ['Can customers add appointments to their own Google Calendar?','Supported booking confirmation experiences may provide a Google Calendar action that lets customers add the appointment to their own calendar. Using this option is not required for the appointment itself.']
  ]],
  ['Booking records and management', [
    ['Where can I see all appointments?','Open Booking Records in Appointment Lite. Merchants can review the customer and service, appointment schedule, staff and location, payment status, appointment status, booking activity, and available management actions.'],
    ['Can an existing appointment be edited?','Yes. Merchants can open the available actions for a booking and make supported changes depending on its current status. Customers may also be able to reschedule or cancel through a valid booking management link.'],
    ['Can appointments be cancelled?','Yes. When a booking is cancelled, Appointment Lite updates the appointment lifecycle and may release staff availability, update the calendar event, and send notifications according to configuration. Cancelling a booking does not automatically cancel or refund a SHOPLINE order.'],
    ['Can booking records be deleted?','Yes. Deleting a booking record requires confirmation to prevent accidental deletion. For active bookings, Appointment Lite may also release scheduling resources depending on the record type. Deleting an Appointment Lite record does not delete the associated SHOPLINE order.']
  ]],
  ['Privacy, uninstall, and support', [
    ['What happens when Appointment Lite is uninstalled?','After uninstallation, Appointment Lite can no longer use the store previous active authorization to retrieve new SHOPLINE information, and storefront booking functionality will stop operating normally. Certain historical records may be retained for a reasonable period for security, recovery, dispute resolution, or legal purposes.'],
    ['How can I request deletion of my store data?','The store owner or an authorized administrator can submit a deletion request through the official Appointment Lite support channel. Please provide sufficient information to verify the SHOPLINE store associated with the request. Valid requests will be reviewed and processed according to the applicable policy.'],
    ['How do I contact Appointment Lite support?','For installation, booking, staff, location, SHOPLINE order, Google Calendar, or notification questions, use the official Appointment Lite support contact listed in the SHOPLINE App Store. When possible, include the store domain, approximate issue time, service name, relevant booking or order information, and screenshots. Do not send passwords, full payment card information, or unnecessary sensitive information through standard support channels.']
  ]]
];

function homeBody(locale) {
  const zh = locale === 'zh-cn';
  const supportEmail = String(config.legal.supportEmail || '').trim();
  const support = supportEmail
    ? `<a class="home-link" href="mailto:${esc(supportEmail)}">${esc(supportEmail)}</a>`
    : (zh ? '请通过 SHOPLINE App Store 中 Appointment Lite 的官方支持联系方式联系我们。' : 'Please use the official Appointment Lite support contact listed in the SHOPLINE App Store.');
  return `
<main class="home-main">
  <section class="home-hero">
    <div class="home-hero-copy">
      <p class="eyebrow">Appointment Lite · SHOPLINE Scheduling</p>
      <h1>${zh ? '把 SHOPLINE 商品、订单与服务预约连接起来' : 'Connect SHOPLINE commerce with service scheduling'}</h1>
      <p class="home-lead">${zh ? 'Appointment Lite 帮助商家创建商品预约、独立预约、付费预约和购买后预约，并在同一个工作空间中管理员工、地点、通知与 Google Calendar。' : 'Appointment Lite helps merchants run product appointments, standalone bookings, paid bookings, and post-purchase scheduling while managing staff, locations, notifications, and Google Calendar from one workspace.'}</p>
      <div class="home-actions"><a class="primary-link" href="/${locale}/faq">${zh ? '查看 FAQ' : 'View FAQ'}</a><a class="secondary-link" href="/${locale}/privacy">${zh ? '隐私政策' : 'Privacy Policy'}</a></div>
    </div>
    <div class="home-product-card" aria-label="${zh ? 'Appointment Lite 功能摘要' : 'Appointment Lite capability summary'}">
      <div class="mini-brand"><span class="brand-mark">${calendarIcon()}</span><div><strong>Appointment Lite</strong><span>${zh ? '预约与服务管理' : 'Scheduling & service management'}</span></div></div>
      <div class="mini-flow"><span>${zh ? 'SHOPLINE 商品 / 订单' : 'SHOPLINE product / order'}</span><b>→</b><span>${zh ? '预约时间' : 'Appointment time'}</span><b>→</b><span>${zh ? '员工 / 地点 / 日历' : 'Staff / location / calendar'}</span></div>
    </div>
  </section>

  <section class="home-section">
    <div class="section-heading"><p class="eyebrow">${zh ? '核心能力' : 'Core capabilities'}</p><h2>${zh ? '为服务型业务提供灵活的预约流程' : 'Flexible booking flows for service-based businesses'}</h2></div>
    <div class="feature-grid">
      <article class="feature-card"><span class="feature-icon">01</span><h3>${zh ? '多种预约模式' : 'Multiple booking modes'}</h3><p>${zh ? '支持直接预约、商品关联预约、付费预约和购买后预约，并可配置服务时长、容量、缓冲时间及特殊排班。' : 'Support direct bookings, product-linked appointments, paid bookings, and post-purchase scheduling with configurable duration, capacity, buffers, and special availability.'}</p></article>
      <article class="feature-card"><span class="feature-icon">02</span><h3>${zh ? '员工与服务地点' : 'Staff and service locations'}</h3><p>${zh ? '管理员工工作时间和服务分配，并使用 SHOPLINE Location、客户地址、线上服务或自定义地点安排履约。' : 'Manage staff working hours and service assignments, and schedule fulfillment using SHOPLINE Locations, customer addresses, online services, or custom locations.'}</p></article>
      <article class="feature-card"><span class="feature-icon">03</span><h3>${zh ? '订单与预约生命周期' : 'Order and booking lifecycle'}</h3><p>${zh ? '对于购买后预约，分别跟踪 SHOPLINE 付款状态和预约状态，让订单履约过程更加清晰。' : 'For post-purchase scheduling, track SHOPLINE payment progress separately from appointment progress for clearer service fulfillment.'}</p></article>
      <article class="feature-card"><span class="feature-icon">04</span><h3>${zh ? '品牌化前台体验' : 'Brand-aware storefront experience'}</h3><p>${zh ? '自定义预约按钮、主题色、CTA 布局以及可选表单字段，使预约体验更自然地融入商家主题。' : 'Customize booking buttons, accent colors, CTA layout, and optional form fields so the booking experience fits the merchant storefront.'}</p></article>
    </div>
  </section>

  <section class="home-section integration-panel">
    <div><p class="eyebrow">Google Calendar</p><h2>${zh ? '由商家主动连接的 Business Google Calendar' : 'Merchant-authorized Business Google Calendar'}</h2><p>${zh ? 'Appointment Lite 仅在商家主动连接后使用 Google Calendar，用于读取商家拥有的可用日历列表，并在所选日历中创建、更新或删除与预约对应的事件。客户无需 Gmail 才能完成预约。' : 'Appointment Lite uses Google Calendar only after the merchant explicitly connects it. The App reads the list of calendars owned by the account and creates, updates, or deletes appointment events on the selected owned calendar. Customers do not need Gmail to complete a booking.'}</p></div>
    <div class="integration-points"><span>${zh ? '商家主动授权' : 'Merchant initiated authorization'}</span><span>${zh ? '仅用于预约日历同步' : 'Used only for appointment calendar sync'}</span><span>${zh ? '可随时断开或撤销' : 'Can be disconnected or revoked'}</span></div>
  </section>

  <section class="home-section trust-grid">
    <article class="trust-card"><h2>${zh ? '隐私与数据处理' : 'Privacy and data handling'}</h2><p>${zh ? '了解 Appointment Lite 如何处理 SHOPLINE 店铺、商品、订单、预约、员工、地点和 Google Calendar 相关信息。' : 'Learn how Appointment Lite processes information related to SHOPLINE stores, products, orders, bookings, staff, locations, and Google Calendar.'}</p><a href="/${locale}/privacy">${zh ? '阅读隐私政策 →' : 'Read Privacy Policy →'}</a></article>
    <article class="trust-card"><h2>${zh ? '使用条款' : 'Terms of Service'}</h2><p>${zh ? '查看商家使用 Appointment Lite 时适用的服务范围、责任、第三方服务和终止规则。' : 'Review the service scope, merchant responsibilities, third-party services, and termination rules that apply when using Appointment Lite.'}</p><a href="/${locale}/terms">${zh ? '阅读服务条款 →' : 'Read Terms of Service →'}</a></article>
    <article class="trust-card"><h2>${zh ? '帮助与支持' : 'Help and support'}</h2><p>${zh ? 'FAQ 覆盖安装、预约、员工、Location、订单、Google Calendar、通知以及数据删除等常见问题。' : 'The FAQ covers installation, bookings, staff, Locations, orders, Google Calendar, notifications, data deletion, and other common topics.'}</p><a href="/${locale}/faq">${zh ? '打开 FAQ →' : 'Open FAQ →'}</a></article>
  </section>

  <section class="home-support"><div><p class="eyebrow">${zh ? '支持' : 'Support'}</p><h2>${zh ? '需要帮助？' : 'Need help?'}</h2><p>${zh ? '如遇到安装、预约、员工、订单、Google Calendar 或通知问题，请联系我们。' : 'Contact us for help with installation, bookings, staff, orders, Google Calendar, or notifications.'}</p></div><div>${support}</div></section>
</main>`;
}

const termsZh = `
<main class="legal-main">
  <div class="legal-hero">
    <p class="eyebrow">Appointment Lite · Legal</p>
    <h1>服务条款</h1>
    <p class="lead">本条款说明 SHOPLINE 商家安装和使用 Appointment Lite 时适用的基本规则、服务范围和责任。</p>
    <div class="meta"><span><strong>生效日期</strong>：2026 年 8 月 27 日</span><span><strong>最后更新</strong>：2026 年 8 月 27 日</span></div>
  </div>
  <article class="legal-card privacy-card terms-card">
    <p>欢迎使用 Appointment Lite。安装、授权、访问或使用本应用，即表示您代表相关 SHOPLINE 店铺同意遵守本服务条款。如果您无权代表该店铺接受本条款，请勿安装或使用 Appointment Lite。</p>
    <section><h2>1. 服务范围</h2><p>Appointment Lite 是面向 SHOPLINE 商家的预约和服务管理应用，可提供商品预约、独立预约、付费预约、购买后预约、员工排班、服务地点、邮件通知、Google Calendar 同步及店铺前台预约体验等功能。具体可用功能可能随版本、商家配置和第三方平台能力而变化。</p></section>
    <section><h2>2. SHOPLINE 安装与授权</h2><p>商家需要通过 SHOPLINE 的授权流程安装应用，并授予 Appointment Lite 提供所选功能所必需的权限。商家应确保其拥有管理相关 SHOPLINE 店铺和授权应用的合法权限。</p><p>如果店铺授权被撤销、店铺被冻结、关闭或应用被卸载，部分或全部功能可能立即停止工作。</p></section>
    <section><h2>3. 商家责任</h2><p>商家负责其服务内容、价格、预约规则、员工排班、地点、客户沟通以及实际履约。商家还应确保其通过 Appointment Lite 收集和使用客户信息的方式符合适用法律及其自己的隐私政策。</p><p>商家应维护准确的服务和排班配置，并及时处理因订单、付款、员工或履约变化产生的预约问题。</p></section>
    <section><h2>4. 客户预约</h2><p>Appointment Lite 根据商家配置帮助客户选择服务、日期、时间、员工和地点。预约是否最终履约，以及因商家服务产生的取消、退款、改期或争议，应由商家按照其业务政策和适用法律处理。</p></section>
    <section><h2>5. SHOPLINE 商品、订单与付款</h2><p>Appointment Lite 可以根据商家配置将预约与 SHOPLINE 商品和订单关联，并读取授权范围内的订单及付款状态，用于判断预约资格或展示订单生命周期。</p><p>除非未来明确提供并获得相应授权，Appointment Lite 不会通过正常预约功能修改、取消、退款或删除 SHOPLINE 订单。SHOPLINE 的结账、支付、退款及订单规则由 SHOPLINE 和商家各自适用的条款控制。</p></section>
    <section><h2>6. Google Calendar</h2><p>商家可以选择连接 Business Google Calendar。只有在商家主动完成 Google OAuth 授权后，Appointment Lite 才会使用相关 Google Calendar 权限，以读取账号拥有的日历列表，并在商家选定的自有日历中创建、更新或删除预约事件。</p><p>商家可以随时在 Appointment Lite 中断开连接，或通过 Google Account 撤销授权。Google 服务本身受 Google 的条款和政策约束。</p></section>
    <section><h2>7. 邮件通知</h2><p>如果商家启用通知，Appointment Lite 可以发送预约确认、变更、取消、提醒、员工通知或购买后预约链接等事务性邮件。商家应确保其使用通知功能符合适用的电子通信和营销法律。</p></section>
    <section><h2>8. 第三方服务</h2><p>Appointment Lite 依赖 SHOPLINE、云托管、数据库、邮件服务、Google Calendar 等第三方服务。第三方服务中断、接口变更、账户限制或政策变化可能影响部分功能。我们会在合理范围内维护兼容性，但无法保证第三方服务始终可用。</p></section>
    <section><h2>9. 可接受使用</h2><p>您不得利用 Appointment Lite 从事违法、欺诈、侵权、骚扰、未经授权访问、恶意自动化、破坏平台安全或其他可能损害客户、SHOPLINE、第三方或本应用正常运行的活动。</p></section>
    <section><h2>10. 服务可用性与变更</h2><p>我们可能为了安全、稳定性、合规、第三方接口变化或产品改进而更新、限制、暂停或调整部分功能。我们会尽合理努力保持服务可用，但不保证应用在任何时间均无中断或无错误。</p></section>
    <section><h2>11. 费用与订阅</h2><p>如 Appointment Lite 提供付费套餐、试用或订阅，其价格、计费周期、试用和取消规则以 SHOPLINE App Store、应用内订阅页面或购买时展示的信息为准。SHOPLINE 可能负责相应的应用计费和订阅处理。</p></section>
    <section><h2>12. 数据与隐私</h2><p>我们如何收集、使用、存储和处理数据，以 Appointment Lite 的<a href="/zh-cn/privacy">隐私政策</a>为准。商家仍需为其自身对客户数据的处理和隐私告知承担责任。</p></section>
    <section><h2>13. 知识产权</h2><p>Appointment Lite 的软件、界面、品牌、文档和相关内容中的知识产权归其合法权利人所有。除正常使用应用所必需的有限权利外，本条款不向商家转让任何知识产权。</p></section>
    <section><h2>14. 免责声明与责任限制</h2><p>在适用法律允许的最大范围内，Appointment Lite 按“现状”和“可用”基础提供。我们不对第三方平台故障、商家错误配置、客户提供错误信息、网络中断或超出我们合理控制范围的事件承担保证责任。</p><p>任何责任限制均受适用法律约束，本条款不会排除法律不得排除的责任。</p></section>
    <section><h2>15. 暂停、卸载与终止</h2><p>商家可以通过 SHOPLINE 卸载 Appointment Lite。我们也可能在存在安全风险、违法或严重违反本条款的情况下限制或暂停访问。卸载或终止后的数据处理按照隐私政策执行。</p></section>
    <section><h2>16. 条款更新与联系我们</h2><p>我们可能随产品、法律或第三方平台变化更新本条款。更新版本将在本页面公布并标注最后更新日期。继续使用更新后的 Appointment Lite 可能构成对更新条款的接受，但适用法律另有要求的除外。</p><div class="contact-box">${contactDetails('zh-cn')}</div></section>
  </article>
</main>`;

const termsEn = `
<main class="legal-main">
  <div class="legal-hero">
    <p class="eyebrow">Appointment Lite · Legal</p>
    <h1>Terms of Service</h1>
    <p class="lead">These Terms describe the basic rules, service scope, and responsibilities that apply when a SHOPLINE merchant installs and uses Appointment Lite.</p>
    <div class="meta"><span><strong>Effective date</strong>: August 27, 2026</span><span><strong>Last updated</strong>: August 27, 2026</span></div>
  </div>
  <article class="legal-card privacy-card terms-card">
    <p>Welcome to Appointment Lite. By installing, authorizing, accessing, or using the App, you agree to these Terms of Service on behalf of the applicable SHOPLINE store. If you are not authorized to accept these Terms for that store, do not install or use Appointment Lite.</p>
    <section><h2>1. Service Scope</h2><p>Appointment Lite is a scheduling and service management application for SHOPLINE merchants. Features may include product appointments, standalone bookings, paid bookings, post-purchase scheduling, staff availability, service locations, email notifications, Google Calendar synchronization, and storefront booking experiences. Available functionality may change based on product versions, merchant configuration, and third-party platform capabilities.</p></section>
    <section><h2>2. SHOPLINE Installation and Authorization</h2><p>Merchants install Appointment Lite through SHOPLINE and grant permissions required for the selected functionality. You are responsible for ensuring that you are authorized to manage the applicable SHOPLINE store and authorize applications on its behalf.</p><p>If store authorization is revoked, the store is frozen or closed, or the App is uninstalled, some or all functionality may stop immediately.</p></section>
    <section><h2>3. Merchant Responsibilities</h2><p>Merchants are responsible for their services, pricing, appointment rules, staff schedules, locations, customer communications, and actual service fulfillment. Merchants are also responsible for ensuring that their collection and use of customer information through Appointment Lite complies with applicable law and their own privacy notices.</p><p>Merchants should maintain accurate service and availability settings and address booking issues caused by changes to orders, payments, staff availability, or fulfillment.</p></section>
    <section><h2>4. Customer Bookings</h2><p>Appointment Lite helps customers select services, dates, times, staff, and locations according to merchant configuration. Actual fulfillment and any cancellation, refund, rescheduling, or service dispute remain the merchant responsibility under its business policies and applicable law.</p></section>
    <section><h2>5. SHOPLINE Products, Orders, and Payments</h2><p>Appointment Lite may associate bookings with SHOPLINE products and orders and may read authorized order and payment status information to determine booking eligibility or display lifecycle progress.</p><p>Unless a future feature expressly provides otherwise with appropriate authorization, normal Appointment Lite booking functionality does not modify, cancel, refund, or delete SHOPLINE orders. Checkout, payment, refund, and order handling remain subject to SHOPLINE and merchant terms that apply to those activities.</p></section>
    <section><h2>6. Google Calendar</h2><p>Merchants may choose to connect a Business Google Calendar. Appointment Lite uses Google Calendar permissions only after the merchant explicitly completes Google OAuth authorization, in order to read the calendars owned by the account and create, update, or delete appointment events on the selected owned calendar.</p><p>Merchants may disconnect the integration in Appointment Lite or revoke authorization through their Google Account. Google services are also subject to Google terms and policies.</p></section>
    <section><h2>7. Email Notifications</h2><p>When enabled by the merchant, Appointment Lite may send transactional booking confirmations, changes, cancellations, reminders, staff notifications, or private post-purchase scheduling links. Merchants are responsible for using notification features in accordance with applicable electronic communications and marketing laws.</p></section>
    <section><h2>8. Third-Party Services</h2><p>Appointment Lite relies on third-party services such as SHOPLINE, cloud hosting, databases, email delivery providers, and Google Calendar. Outages, API changes, account restrictions, or policy changes at those providers may affect functionality. We will make reasonable efforts to maintain compatibility but cannot guarantee uninterrupted availability of third-party services.</p></section>
    <section><h2>9. Acceptable Use</h2><p>You may not use Appointment Lite for unlawful, fraudulent, infringing, harassing, unauthorized-access, malicious automation, security-disrupting, or other activities that could harm customers, SHOPLINE, third parties, or the normal operation of the App.</p></section>
    <section><h2>10. Availability and Changes</h2><p>We may update, limit, suspend, or adjust functionality for security, reliability, compliance, third-party API changes, or product improvement. We will make reasonable efforts to keep the service available but do not guarantee that Appointment Lite will be uninterrupted or error-free at all times.</p></section>
    <section><h2>11. Fees and Subscriptions</h2><p>If Appointment Lite offers paid plans, trials, or subscriptions, pricing, billing periods, trial conditions, and cancellation terms are those presented in the SHOPLINE App Store, the App subscription interface, or at the time of purchase. SHOPLINE may process applicable app billing and subscription transactions.</p></section>
    <section><h2>12. Data and Privacy</h2><p>Our collection, use, storage, and processing of information is described in the Appointment Lite <a href="/en/privacy">Privacy Policy</a>. Merchants remain responsible for their own customer data processing and privacy disclosures.</p></section>
    <section><h2>13. Intellectual Property</h2><p>Intellectual property rights in the Appointment Lite software, interface, branding, documentation, and related content remain with their lawful owners. These Terms provide only the limited rights necessary to use the App and do not transfer intellectual property ownership to merchants.</p></section>
    <section><h2>14. Disclaimers and Limitation of Liability</h2><p>To the maximum extent permitted by applicable law, Appointment Lite is provided on an “as is” and “as available” basis. We do not warrant against failures caused by third-party platforms, merchant misconfiguration, inaccurate customer information, network outages, or events outside our reasonable control.</p><p>Any limitation of liability remains subject to applicable law, and these Terms do not exclude liability that cannot legally be excluded.</p></section>
    <section><h2>15. Suspension, Uninstallation, and Termination</h2><p>Merchants may uninstall Appointment Lite through SHOPLINE. We may also restrict or suspend access where necessary to address security risks, unlawful use, or material violations of these Terms. Data handling after uninstallation or termination is governed by the Privacy Policy.</p></section>
    <section><h2>16. Changes to These Terms and Contact</h2><p>We may update these Terms as the product, law, or third-party platforms change. Updated Terms will be published on this page with a revised Last Updated date. Continued use of Appointment Lite after an update may constitute acceptance where permitted by applicable law.</p><div class="contact-box">${contactDetails('en')}</div></section>
  </article>
</main>`;

function faqBody(locale) {
  const zh = locale === 'zh-cn';
  const groups = zh ? faqZh : faqEn;
  const count = groups.reduce((sum, [, items]) => sum + items.length, 0);
  const sections = groups.map(([title, items], sectionIndex) => `
    <section class="faq-section" data-faq-section>
      <h2 class="faq-section-title"><span>${sectionIndex + 1}</span>${esc(title)}</h2>
      ${items.map(([question, answer]) => `<details class="faq-item" data-faq-item><summary>${esc(question)}</summary><div class="faq-answer"><p>${esc(answer)}</p></div></details>`).join('')}
    </section>`).join('');
  return `
<main class="legal-main">
  <div class="legal-hero">
    <p class="eyebrow">Appointment Lite · Help Center</p>
    <h1>${zh ? '常见问题' : 'Frequently Asked Questions'}</h1>
    <p class="lead">${zh ? `这里整理了 Appointment Lite 当前核心功能的 ${count} 个常见问题，包括预约方式、SHOPLINE 订单、员工、地点、前台样式、通知、Google Calendar 和数据处理。` : `Find answers to ${count} common questions about booking flows, SHOPLINE orders, staff, locations, storefront customization, notifications, Google Calendar, and data handling.`}</p>
  </div>
  <div class="faq-layout">
    <div class="faq-toolbar"><div class="faq-search-wrap"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input class="faq-search" type="search" data-faq-search placeholder="${zh ? '搜索问题，例如：Google Calendar、订单、员工...' : 'Search questions, e.g. Google Calendar, orders, staff...'}" aria-label="${zh ? '搜索 FAQ' : 'Search FAQ'}"></div></div>
    <div>${sections}<div class="faq-empty" data-faq-empty hidden>${zh ? '没有找到相关问题，请尝试其他关键词。' : 'No matching questions. Try another search term.'}</div></div>
  </div>
</main>`;
}

export function homePage(locale = 'en') {
  const normalized = locale === 'zh-cn' ? 'zh-cn' : 'en';
  return legalShell({
    locale: normalized,
    type: 'home',
    title: normalized === 'zh-cn' ? 'SHOPLINE 预约与服务管理' : 'Scheduling for SHOPLINE stores',
    lead: normalized === 'zh-cn' ? 'Appointment Lite 将 SHOPLINE 商品、订单与服务预约连接起来，并提供员工、地点、通知和 Google Calendar 管理。' : 'Appointment Lite connects SHOPLINE products and orders with service scheduling, staff, locations, notifications, and Google Calendar.',
    body: homeBody(normalized)
  });
}

export function privacyPage(locale = 'en') {
  const normalized = locale === 'zh-cn' ? 'zh-cn' : 'en';
  return legalShell({
    locale: normalized,
    type: 'privacy',
    title: normalized === 'zh-cn' ? '隐私政策' : 'Privacy Policy',
    lead: normalized === 'zh-cn' ? 'Appointment Lite 隐私政策与数据处理说明。' : 'Appointment Lite privacy policy and data processing information.',
    body: normalized === 'zh-cn' ? privacyZh : privacyEn
  });
}

export function termsPage(locale = 'en') {
  const normalized = locale === 'zh-cn' ? 'zh-cn' : 'en';
  return legalShell({
    locale: normalized,
    type: 'terms',
    title: normalized === 'zh-cn' ? '服务条款' : 'Terms of Service',
    lead: normalized === 'zh-cn' ? 'Appointment Lite 服务范围、商家责任与第三方集成使用条款。' : 'Appointment Lite service scope, merchant responsibilities, and third-party integration terms.',
    body: normalized === 'zh-cn' ? termsZh : termsEn
  });
}

export function faqPage(locale = 'en') {
  const normalized = locale === 'zh-cn' ? 'zh-cn' : 'en';
  return legalShell({
    locale: normalized,
    type: 'faq',
    title: normalized === 'zh-cn' ? '常见问题' : 'FAQ',
    lead: normalized === 'zh-cn' ? 'Appointment Lite 常见问题与使用说明。' : 'Appointment Lite frequently asked questions and help.',
    body: faqBody(normalized)
  });
}

export function preferredLegalLocale(acceptLanguage = '') {
  return /^\s*zh(?:-|_|,|;|$)/i.test(String(acceptLanguage || '')) || /(?:^|,)\s*zh(?:-|_|;|,|$)/i.test(String(acceptLanguage || '')) ? 'zh-cn' : 'en';
}

export const legalEffectiveDate = EFFECTIVE_DATE_ISO;
