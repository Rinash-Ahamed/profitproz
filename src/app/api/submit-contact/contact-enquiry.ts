type EnquiryData = {
  name: string
  email?: string
  phone: string
  hotel: string
  rooms?: string
  service: string
  message?: string
}

export function getContactEnquiryHtml({ name, email, phone, hotel, rooms, service, message }: EnquiryData): string {
  return `
<div style="margin:0;padding:40px 16px;background:#09090B;font-family:Inter,Segoe UI,Arial,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
    <tr>
      <td>

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:28px;">
          <img
            src="https://profitproz.com/profitpro.png"
            alt="ProfitPro"
            width="170"
            style="display:block;margin:auto;"
          />
        </div>

        <!-- Main Card -->
        <div style="
          background:#18181B;
          border:1px solid #27272A;
          border-radius:20px;
          overflow:hidden;
        ">

          <!-- Header -->
          <div style="
            padding:40px 36px;
            border-bottom:1px solid #27272A;
            text-align:center;
          ">

            <div style="
              display:inline-block;
              padding:8px 14px;
              background:#111113;
              border:1px solid #27272A;
              border-radius:999px;
              color:#A1A1AA;
              font-size:12px;
              text-transform:uppercase;
              letter-spacing:.08em;
              font-weight:600;
            ">
              New Revenue Audit Request
            </div>

            <h1 style="
              margin:22px 0 10px;
              color:#FAFAFA;
              font-size:30px;
              line-height:36px;
              font-weight:700;
            ">
              New Website Enquiry
            </h1>

            <p style="
              margin:0;
              color:#A1A1AA;
              font-size:16px;
              line-height:28px;
            ">
              A new enquiry has been submitted through your website.
            </p>

          </div>

          <div style="padding:28px;">

            <!-- Contact -->
            <div style="
              background:#111113;
              border:1px solid #27272A;
              border-radius:16px;
              padding:24px;
            ">

              <h3 style="
                margin:0 0 24px;
                color:#FAFAFA;
                font-size:18px;
              ">
                Contact Details
              </h3>

              ${[
                ["Name", name],
                ["Hotel", hotel],
                ["Phone", phone],
                ["Email", email || "Not Provided"]
              ].map(([label, value], index, arr) => `
                <div style="
                  padding:16px 0;
                  ${index !== arr.length - 1 ? "border-bottom:1px solid #27272A;" : ""}
                ">

                  <div style="
                    color:#71717A;
                    font-size:11px;
                    letter-spacing:.12em;
                    text-transform:uppercase;
                    margin-bottom:8px;
                  ">
                    ${label}
                  </div>

                  <div style="
                    color:#FAFAFA;
                    font-size:16px;
                    font-weight:600;
                    line-height:24px;
                    word-break:break-word;
                  ">
                    ${value}
                  </div>

                </div>
              `).join("")}

            </div>

            <!-- Business -->

            <div style="
              margin-top:20px;
              background:#111113;
              border:1px solid #27272A;
              border-radius:16px;
              padding:24px;
            ">

              <h3 style="
                margin:0 0 24px;
                color:#FAFAFA;
                font-size:18px;
              ">
                Business Details
              </h3>

              ${[
                ["Rooms", rooms || "Not Provided"],
                ["Service", service]
              ].map(([label, value], index, arr) => `
                <div style="
                  padding:16px 0;
                  ${index !== arr.length - 1 ? "border-bottom:1px solid #27272A;" : ""}
                ">

                  <div style="
                    color:#71717A;
                    font-size:11px;
                    letter-spacing:.12em;
                    text-transform:uppercase;
                    margin-bottom:8px;
                  ">
                    ${label}
                  </div>

                  <div style="
                    color:#FAFAFA;
                    font-size:16px;
                    font-weight:600;
                    line-height:24px;
                    word-break:break-word;
                  ">
                    ${value}
                  </div>

                </div>
              `).join("")}

            </div>

            ${
              message
                ? `
            <!-- Message -->

            <div style="
              margin-top:20px;
              background:#111113;
              border:1px solid #27272A;
              border-radius:16px;
              padding:24px;
            ">

              <h3 style="
                margin:0 0 18px;
                color:#FAFAFA;
                font-size:18px;
              ">
                Message
              </h3>

              <div style="
                color:#A1A1AA;
                font-size:15px;
                line-height:28px;
                white-space:pre-wrap;
                word-break:break-word;
              ">
                ${message}
              </div>

            </div>
            `
                : ""
            }

            <!-- CTA -->

            ${
              email
                ? `
            <div style="text-align:center;margin-top:32px;">

              <a
                href="mailto:${email}"
                style="
                  display:inline-block;
                  background:#FAFAFA;
                  color:#09090B;
                  text-decoration:none;
                  padding:14px 28px;
                  border-radius:12px;
                  font-size:15px;
                  font-weight:600;
                "
              >
                Reply to Client
              </a>

            </div>
            `
                : ""
            }

          </div>

        </div>

        <!-- Footer -->

        <div style="
          text-align:center;
          padding:24px 16px;
          color:#71717A;
          font-size:13px;
          line-height:22px;
        ">
          <div style="
            color:#FAFAFA;
            font-weight:600;
            margin-bottom:4px;
          ">
            ProfitPro
          </div>

          Turn Potential Into Profit
        </div>

      </td>
    </tr>
  </table>

</div>
`
}