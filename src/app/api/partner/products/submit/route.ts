import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validatePartnerSession } from '@/lib/auth/partner-auth';
import { createPendingProductSubmission } from '@/lib/productSubmission';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function getPartnerFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('partner-token')?.value;
  if (!token) return null;
  try {
    const partner = await validatePartnerSession(token);
    return partner?.id || null;
  } catch {
    return null;
  }
}

// POST - a partner (dealer/distributor/sales rep) submits a new product for
// admin approval. partnerId is always forced to the logged-in partner.
export async function POST(request: NextRequest) {
  try {
    const partnerId = await getPartnerFromSession();
    if (!partnerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`product-submit:partner:${partnerId}`, 20, 60 * 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many submissions this hour. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    formData.set('partnerId', String(partnerId));

    if (!formData.get('companyId')) {
      return NextResponse.json({ error: 'Please select which company manufactures this product' }, { status: 400 });
    }

    const product = await createPendingProductSubmission(formData, 'PARTNER');
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error submitting partner product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 400 }
    );
  }
}
