export const mbbsHierarchy = [
  {
    subject: "Anatomy",
    topics: [
      "Embryology", "Histology", "Neuroanatomy", "Head and Neck", "Upper Limb", "Thorax", "Abdomen", "Lower Limb", "General Anatomy"
    ]
  },
  {
    subject: "Biochemistry",
    topics: [
      "General Topics", "Enzymology", "Carbohydrates", "Lipids", "Proteins", "Bioenergetics", "Molecular Biology", "Vitamins"
    ]
  },
  {
    subject: "Physiology",
    topics: [
      "General Physiology", "Nerve Muscle Physiology", "Central Nervous System", "Respiratory System", "Cardiovascular System", "Gastrointestinal System", "Renal Physiology", "Endocrine Physiology", "Reproductive Physiology", "Exercise Physiology"
    ]
  },
  {
    subject: "Microbiology",
    topics: [
      "General Microbiology", "Bacteriology", "Immunology", "Virology", "Protozoology", "Helminthology", "Mycology", "Clinical Microbiology"
    ]
  },
  {
    subject: "Pharmacology",
    topics: [
      "General Pharmacology", "Autonomic Nervous System", "Cardiovascular System", "Renal System", "Nervous System", "Antimicrobials", "Endocrine System", "Autacoids", "Hematology", "Respiratory System", "Gastrointestinal Drugs", "Immunomodulators", "Anti-Neoplastic Agents"
    ]
  },
  {
    subject: "Pathology",
    topics: [
      "General Pathology", "Hematology", "Cardiovascular System", "Genito-urinary System", "Gastrointestinal System", "Respiratory System", "Endocrine System", "Skin and Musculoskeletal System", "Nervous System", "Miscellaneous"
    ]
  },
  {
    subject: "Community Medicine",
    topics: [
      "Demography and Family Planning", "Maternal and Child Health", "Vaccine and Immunization", "Epidemiology", "Screening of Diseases", "Biostatistics", "National Health Programmes", "Healthcare Planning", "Infectious Diseases Epidemiology", "Communicable Disease", "Non-communicable disease", "Nutrition", "Environment", "Biomedical Waste Management", "Occupation Health", "Concept of Health and Diseases", "Disaster Management", "Health Communication", "International Health Organisations", "Social Medicine", "Miscellaneous"
    ]
  },
  {
    subject: "Forensic Medicine",
    topics: [
      "Forensic Traumatology", "Medical Jurisprudence", "Forensic Pathology", "Sexual Jurisprudence", "Toxicology", "Forensic Psychiatry"
    ]
  },
  {
    subject: "Medicine",
    topics: [
      "Gastroenterology", "Hematology", "Pulmonology", "Cardiology", "ECG", "Rheumatology", "Neurology", "Nephrology", "Acid-Base Regulation", "Endocrinology", "Hepatology", "Infectious Diseases"
    ]
  },
  {
    subject: "Surgery",
    topics: [
      "General Surgery", "Breast", "Endocrine System", "Gastrointestinal and Abdominal Surgery", "Urology", "Speciality Surgery", "Trauma", "Hernia", "Vascular Surgery", "Faciomaxillary Surgery", "Miscellaneous"
    ]
  },
  {
    subject: "Obstetrics and Gynaecology",
    topics: [
      "General Gynaecology", "Gynaecological Infections", "Infertility and Contraception", "Gynaecological Oncology", "Fundamentals of Reproduction", "Normal Pregnancy and Antenatal Care", "Complications in Surgery", "Obstetrics complications", "Labor and Puerperium"
    ]
  },
  {
    subject: "Paediatrics",
    topics: [
      "Neonatology", "Growth and Development", "Nutrition", "Genetic Disorders", "Childhood Infections", "Gastrointestinal System", "Respiratory System", "Cardiovascular System", "Genito-urinary System", "Nervous System", "Endocrine System", "Childhood Malignancies", "Paediatric Rheumatology", "Hematology", "Miscellaneous"
    ]
  },
  {
    subject: "Orthopedics (Minor)",
    topics: []
  },
  {
    subject: "Anaesthesia (Minor)",
    topics: []
  },
  {
    subject: "Radiology (Minor)",
    topics: []
  },
  {
    subject: "Psychiatry (Minor)",
    topics: []
  },
  {
    subject: "Dermatology (Minor)",
    topics: []
  },
  {
    subject: "Ophthalmology",
    topics: [
      "Basic Anatomy of Eye", "Neuro-Ophthalmology", "Squint", "Lens", "Glaucoma", "Optics", "Retina", "Cornea", "Uvea", "Conjunctiva adnexa", "Miscellaneous"
    ]
  },
  {
    subject: "ENT",
    topics: [
      "Ear", "Nose", "Pharynx", "Larynx"
    ]
  }
];

import { db } from '@/db';

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove spaces and punctuation
    .replace(/labour/g, 'labor')
    .replace(/gynaecolog/g, 'gynecolog')
    .replace(/orthopaedics/g, 'orthopedics')
    .replace(/paediatrics/g, 'pediatrics')
    .replace(/tumour/g, 'tumor')
    .replace(/obstetrics/g, 'obstetric')
    .replace(/haematolog/g, 'hematolog')
    .replace(/anaesthesia/g, 'anesthesia')
    .replace(/foetus/g, 'fetus')
    .replace(/foetal/g, 'fetal')
    .replace(/oesophagus/g, 'esophagus')
    .replace(/diarrhoea/g, 'diarrhea')
    .replace(/programme/g, 'program')
    .replace(/complicationsinpregnancy/g, 'complications')
    .replace(/medicalandsurgical/g, ''); // just some aggressive normalization for those specific obstetrics topics
}

export async function loadMBBSPreset() {
  await db.transaction('rw', db.subjects, db.systems, db.uiPreferences, async () => {
    const existingSubjects = await db.subjects.toArray();
    const existingSystems = await db.systems.toArray();
    const existingPrefs = await db.uiPreferences.toArray();
    
    let maxSubjectOrder = -1;
    for (const pref of existingPrefs) {
      if (pref.type === 'subject' && pref.order !== undefined && pref.order > maxSubjectOrder) {
        maxSubjectOrder = pref.order;
      }
    }
    
    let subjectOrder = maxSubjectOrder + 1;

    for (const item of mbbsHierarchy) {
      // Find if subject already exists (case-insensitive)
      let subject = existingSubjects.find(s => normalizeName(s.name) === normalizeName(item.subject));
      let subjectId = subject?.id;

      if (!subjectId) {
        subjectId = await db.subjects.add({ name: item.subject });
        await db.uiPreferences.add({
          id: `subject:${subjectId}`,
          type: 'subject',
          entityId: subjectId,
          order: subjectOrder++,
          focus: null,
          updatedAt: new Date()
        });
      }

      // Find max system order for this subject
      let maxSystemOrder = -1;
      const systemsInSubject = existingSystems.filter(sys => sys.subjectId === subjectId);
      for (const sys of systemsInSubject) {
        const pref = existingPrefs.find(p => p.id === `system:${sys.id}`);
        if (pref && pref.order !== undefined && pref.order > maxSystemOrder) {
          maxSystemOrder = pref.order;
        }
      }
      
      let systemOrder = maxSystemOrder + 1;

      for (const topic of item.topics) {
        // Find if topic already exists under this subject (case-insensitive)
        const topicExists = existingSystems.find(sys => 
          sys.subjectId === subjectId && 
          normalizeName(sys.name) === normalizeName(topic)
        );

        if (!topicExists) {
          const sysId = await db.systems.add({
            subjectId,
            name: topic,
            updatedAt: new Date(),
            nextRevisionDate: null,
            revisionState: 'idle' as const,
            contentInitialized: false,
            contentUnitsTotal: 0,
            contentUnitsCompleted: 0,
            contentCompleted: false,
            completionDate: null,
            revisionCount: 0,
            lastRevisionDate: null,
            currentRevisionInterval: null,
            decayFactor: 1.0,
            isLengthy: false,
            revisionStartedAt: null,
            revisionLastCheckInDate: null,
            revisionDaysLogged: 0,
            revisionProgressPercent: 0,
            qbankDone: false,
            weakAreas: '',
            status: 'Average'
          } as any);
          
          await db.uiPreferences.add({
            id: `system:${sysId}`,
            type: 'system',
            entityId: sysId,
            order: systemOrder++,
            focus: null,
            updatedAt: new Date()
          });
          // Note: Add to existingSystems to prevent duplicates if topics are duplicated in mbbsHierarchy
          // (mbbsHierarchy doesn't have duplicates but it's safe)
        }
      }
    }
  });
}
