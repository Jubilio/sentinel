export interface TakedownData {
  victimName: string;
  victimEmail: string;
  contentUrl: string;
  platform: string;
  detectedAt: string;
  contentDescription: string;
  additionalInfo?: string;
}

export function getDMCATemplate(data: TakedownData): string {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return `DMCA TAKEDOWN NOTICE
Pursuant to 17 U.S.C. § 512(c)

Date: ${date}

To Whom It May Concern:

I am writing to notify you of the presence of content that infringes upon my rights under the Digital Millennium Copyright Act (DMCA).

IDENTIFICATION OF INFRINGING MATERIAL:
- URL: ${data.contentUrl}
- Platform: ${data.platform}
- Date Detected: ${data.detectedAt}
- Description: ${data.contentDescription}

I have a good faith belief that the use of the material in the manner complained of is not authorized by me, my agent, or the law.

I declare under penalty of perjury that the information in this notification is accurate and that I am the owner of the exclusive rights that are being infringed.

I request that you immediately remove or disable access to the infringing material.

${data.additionalInfo ? `ADDITIONAL INFORMATION:\n${data.additionalInfo}\n\n` : ''}Contact Information:
Name: ${data.victimName}
Email: ${data.victimEmail}

Signature: ${data.victimName}
Date: ${date}

---
This notice is sent in accordance with the DMCA, 17 U.S.C. § 512(c)(3).`;
}

export function getGDPRTemplate(data: TakedownData): string {
  const date = new Date().toLocaleDateString('en-GB', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return `RIGHT TO ERASURE REQUEST
Under Article 17 of the General Data Protection Regulation (GDPR)

Date: ${date}

To the Data Controller,

I am exercising my right to erasure ("right to be forgotten") under Article 17 of the GDPR.

CONTENT TO BE ERASED:
- URL: ${data.contentUrl}
- Platform: ${data.platform}
- Date Identified: ${data.detectedAt}
- Description: ${data.contentDescription}

GROUNDS FOR ERASURE:
The personal data is no longer necessary for the purpose for which it was originally collected. The data was processed unlawfully and without my consent. This content constitutes intimate imagery shared without my consent (Non-Consensual Intimate Imagery - NCII).

I request that you:
1. Erase all copies of this content immediately
2. Notify any third parties who have received this data
3. Confirm completion of erasure within 30 days

${data.additionalInfo ? `ADDITIONAL CONTEXT:\n${data.additionalInfo}\n\n` : ''}CONTACT DETAILS:
Name: ${data.victimName}
Email: ${data.victimEmail}

I expect a response within one month as required by Article 12(3) of the GDPR.

Regards,
${data.victimName}`;
}

export function getGenericNTD(data: TakedownData): string {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return `NOTICE AND TAKEDOWN REQUEST
Non-Consensual Intimate Imagery (NCII)

Date: ${date}

Dear Trust & Safety Team,

I am writing to report the presence of intimate imagery of myself that was shared without my consent.

CONTENT DETAILS:
- URL: ${data.contentUrl}
- Platform: ${data.platform}
- Detected: ${data.detectedAt}
- Description: ${data.contentDescription}

This content violates your Terms of Service regarding non-consensual intimate imagery. I did not consent to the distribution of this material and request its immediate removal.

${data.additionalInfo ? `ADDITIONAL INFORMATION:\n${data.additionalInfo}\n\n` : ''}I can provide verification of my identity if required.

Contact:
Name: ${data.victimName}
Email: ${data.victimEmail}

Please confirm receipt and removal within 24-48 hours.

Thank you,
${data.victimName}`;
}
