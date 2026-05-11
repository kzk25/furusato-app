import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 申請書HTMLを一時的にDOMに追加してキャンバス化し、PDFのBlobを返す
 */
async function renderApplicationHTML(donation, applicant) {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:"Hiragino Sans","Meiryo",sans-serif;';

  const formattedDate = donation.date
    ? new Date(donation.date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : donation.date;

  const formattedBirthdate = applicant.birthdate
    ? new Date(applicant.birthdate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : applicant.birthdate;

  container.innerHTML = `
    <div style="padding:40px;color:#111;font-size:13px;line-height:1.8;">
      <h1 style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:4px;border-bottom:2px solid #111;padding-bottom:8px;">
        寄付金税額控除に係る申告特例申請書
      </h1>
      <p style="text-align:center;font-size:11px;color:#555;margin-bottom:24px;">（ワンストップ特例申請書）</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th colspan="2" style="padding:8px 12px;text-align:left;border:1px solid #ccc;font-size:13px;">
              【寄付先情報】
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;width:30%;background:#fafafa;">自治体名</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${donation.municipality}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">返礼品名</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${donation.giftName || '―'}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">寄付日</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">寄付金額</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${donation.amount.toLocaleString()}円</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th colspan="2" style="padding:8px 12px;text-align:left;border:1px solid #ccc;font-size:13px;">
              【申請者情報】
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;width:30%;background:#fafafa;">氏名</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${applicant.name}（${applicant.nameKana}）</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">生年月日</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${formattedBirthdate}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">郵便番号</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">〒${applicant.postalCode}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">住所</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${applicant.address}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">電話番号</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${applicant.phone}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">個人番号</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${applicant.mynumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ccc;background:#fafafa;">本人確認書類</td>
            <td style="padding:6px 12px;border:1px solid #ccc;">${applicant.idType}</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:8px 12px;text-align:left;border:1px solid #ccc;font-size:13px;">
              【申告特例の適用に関する事項】
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;">
              <div style="margin-bottom:8px;">
                □ 住所・氏名等に変更はありません
              </div>
              <div>
                □ この申請以降に変更があった場合は、翌年1月10日までに変更届を提出します
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="border:1px solid #f59e0b;background:#fffbeb;padding:12px;border-radius:4px;font-size:11px;color:#92400e;">
        <strong>⚠️ ご注意</strong><br>
        本申請書は参考様式です。正式な様式・提出先は各自治体のWebサイトよりご確認ください。<br>
        申請書は各自治体の受付期限（翌年1月10日必着が多い）までに郵送してください。
      </div>

      <div style="margin-top:20px;font-size:11px;color:#555;text-align:right;">
        申請日：${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgH = pageW * ratio;

    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
    } else {
      // 複数ページ対応
      let yOffset = 0;
      while (yOffset < canvas.height) {
        const sliceH = Math.min(canvas.height - yOffset, (canvas.width * pageH) / pageW);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext('2d').drawImage(canvas, 0, -yOffset);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', 0, 0, pageW, (sliceH / canvas.width) * pageW);
        yOffset += sliceH;
      }
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 単体または複数の申請書PDFを生成・ダウンロード
 * @param {Object[]} donations
 * @param {Object} applicant
 */
export async function generateApplicationPDFs(donations, applicant) {
  if (donations.length === 1) {
    const blob = await renderApplicationHTML(donations[0], applicant);
    const d = donations[0];
    saveAs(blob, `ワンストップ申請書_${d.municipality}_${d.date}.pdf`);
  } else {
    const zip = new JSZip();
    for (const donation of donations) {
      const blob = await renderApplicationHTML(donation, applicant);
      zip.file(`ワンストップ申請書_${donation.municipality}_${donation.date}.pdf`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'ワンストップ申請書一括.zip');
  }
}
