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

function legalShell({ locale, type, title, lead, body }) {
  const zh = locale === 'zh-cn';
  const privacyHref = `/${locale}/privacy`;
  const faqHref = `/${locale}/faq`;
  const alternateLocale = zh ? 'en' : 'zh-cn';
  const alternateHref = `/${alternateLocale}/${type}`;
  const alternateLabel = zh ? 'English' : '简体中文';
  const description = esc(lead);
  const pageTitle = `${esc(title)} · Appointment Lite`;
  const canonical = `${config.appUrl}/${locale}/${type}`;
  return `<!doctype html>
<html lang="${zh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="alternate" hreflang="zh-CN" href="${esc(`${config.appUrl}/zh-cn/${type}`)}">
  <link rel="alternate" hreflang="en" href="${esc(`${config.appUrl}/en/${type}`)}">
  <link rel="stylesheet" href="/legal/assets/styles.css?v=0.6.12">
  <title>${pageTitle}</title>
</head>
<body>
<div class="legal-shell">
  <header class="legal-topbar">
    <div class="legal-topbar-inner">
      <a class="brand" href="/${locale}/faq" aria-label="Appointment Lite">
        <span class="brand-mark">${calendarIcon()}</span><span>Appointment Lite</span>
      </a>
      <nav class="legal-nav" aria-label="${zh ? '页面导航' : 'Page navigation'}">
        <a href="${privacyHref}" class="${type === 'privacy' ? 'active' : ''}">${zh ? '隐私政策' : 'Privacy'}</a>
        <a href="${faqHref}" class="${type === 'faq' ? 'active' : ''}">FAQ</a>
        <a class="lang" href="${alternateHref}">${alternateLabel}</a>
      </nav>
    </div>
  </header>
  ${body}
  <footer class="legal-footer"><div class="legal-footer-inner"><span>© 2026 Appointment Lite</span><span>${zh ? '面向 SHOPLINE 商家的预约与服务管理应用' : 'Scheduling and service management for SHOPLINE merchants'}</span></div></footer>
</div>
${type === 'faq' ? '<script src="/legal/assets/faq.js?v=0.6.12" defer></script>' : ''}
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
