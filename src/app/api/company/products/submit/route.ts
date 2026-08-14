import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';
import { createPendingProductSubmission } from '@/lib/productSubmission';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;
  if (!token) return null;
  try {
    const company = await validateCompanySession(token);
    return company?.id || null;
  } catch {
    return null;
  }
}

// POST - a company submits a new product for admin approval. companyId is
// always forced to the logged-in company, never trusted from the request.
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    formData.set('companyId', String(companyId));

    if (!formData.get('partnerId')) {
      return NextResponse.json({ error: 'Please select which partner sells this product' }, { status: 400 });
    }

    const product = await createPendingProductSubmission(formData, 'COMPANY');
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error submitting company product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 400 }
    );
  }
}
