// This file no longer talks to Cloudinary — uploads now save to the VPS's
// own disk (see src/lib/localStorage.ts for the real implementation). It's
// kept as a re-export under this same path/filename on purpose: every
// existing caller across the app (product/partner/company/banner/news/job/
// sell-animal uploads, etc.) already imports `uploadImage`, `uploadPDF`,
// `uploadRawFile`, and `deleteFromCloudinary` from '@/lib/cloudinary' — this
// way none of those ~24 files needed to change to move off Cloudinary.
//
// If Cloudinary is ever fully retired, renaming this file (and updating the
// imports) is a safe follow-up cleanup — nothing functional depends on the
// name itself, only on the exports.
export * from './localStorage'
