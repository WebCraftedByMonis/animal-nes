// Partner Types and Specializations Constants

export const partnerTypeOptions = [
  'Veterinarian (Clinic, Hospital, Consultant)',
  'Sales and Marketing (Dealer, Distributor, Sales Person)',
  'Veterinary Assistant',
  'Student',
  'Farmer',
  'Faculty'
] as const;

// Specialization options based on partner type
export const veterinarianSpecializations = [
  'Large Animal Veterinarian',
  'Small Animal Veterinarian',
  'Poultry Veterinarian',
  'Parasitologist',
  'Reproductive and Ultrasound Specialist',
  'Animal Nutritionist',
  'Veterinary Surgeon',
  'Veterinary Pathologist',
  'Wildlife Veterinarian',
  'Public Health Veterinarian'
];

export const salesMarketingSpecializations = [
  'Product Specialist',
  'Equipment Executive',
  'Brand Manager',
  'Sales Officer',
  'Marketing Specialist',
  'Authorized Dealer',
  'Bulk Wholesaler',
  'Regional Distributor',
  'Licensed Importer',
  'Product Manufacturer'
];

export const veterinaryAssistantSpecializations = [
  'EXTENSION (DEWORMING & VACCINATION)',
  'ARTIFICIAL INSEMINATION'
];

export const studentSpecializations = [
  'VETERINARY SCIENCES',
  'POULTRY',
  'DAIRY',
  'FISHERIES',
  'SCIENCE',
  'ARTS'
];

export const farmerSpecializations = [
  'Livestock Farming',
  'Dairy Farming',
  'Poultry Farming',
  'Crop Farming',
  'Fish Farming',
  'Mixed Farming'
];

export const facultySpecializations = [
  'VETERINARY MEDICAL SCIENCES',
  'ARTS'
];

export const getSpecializationsByPartnerType = (partnerType: string) => {
  switch (partnerType) {
    case 'Veterinarian (Clinic, Hospital, Consultant)':
      return veterinarianSpecializations;
    case 'Sales and Marketing (Dealer, Distributor, Sales Person)':
      return salesMarketingSpecializations;
    case 'Veterinary Assistant':
      return veterinaryAssistantSpecializations;
    case 'Student':
      return studentSpecializations;
    case 'Farmer':
      return farmerSpecializations;
    case 'Faculty':
      return facultySpecializations;
    default:
      return [];
  }
};

export const PARTNER_TYPE_GROUPS = {
  veterinarian: ['Veterinarian (Clinic, Hospital, Consultant)'],
  sales: [
    'Sales and Marketing (Dealer, Distributor, Sales Person)',
    'Sales and Marketing ( dealer , distributor , sales person)'
  ],
  veterinary_assistant: ['Veterinary Assistant'],
  student: ['Student'],
  farmer: ['Farmer'],
  faculty: ['Faculty'],
} as const;

export type PartnerTypeGroup = keyof typeof PARTNER_TYPE_GROUPS;