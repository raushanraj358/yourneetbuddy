// Static content: subjects, the NEET (UG) chapter index, curated resources, habits, tips and reminder presets.
// Chapter notes and the offline question bank live in assets/js/content/<subject>.js and are loaded only when needed.

export const EXAM = {
  name: 'NEET (UG)',
  date: '2027-05-02', // NTA usually holds NEET (UG) on the first Sunday of May; update once NTA announces the date.
  questions: 180,
  minutes: 180,
  mark: 4,
  neg: 1,
  maxMarks: 720,
};

export const SUBJECTS = [
  { id: 'physics', name: 'Physics', short: 'Physics', color: '#3b6fd8', icon: 'atom', qs: 45 },
  { id: 'chemistry', name: 'Chemistry', short: 'Chemistry', color: '#9b4fd6', icon: 'flask', qs: 45 },
  { id: 'botany', name: 'Botany', short: 'Botany', color: '#1f9d55', icon: 'leaf', qs: 45 },
  { id: 'zoology', name: 'Zoology', short: 'Zoology', color: '#e0566b', icon: 'heart', qs: 45 },
];
export const subjectById = (id) => SUBJECTS.find((s) => s.id === id) || { id, name: id || 'General', short: id || 'General', color: '#8b8d96', icon: 'book', qs: 0 };

// weight: how often NEET has asked from the chapter recently (H = high, M = medium, L = low). A guide, not a rule.
// ncert: [book code, chapter number, chapters in book] for the official NCERT reader; null when the chapter isn't in the current NCERT.
const ch = (id, name, cls, weight, ncert, topics) => ({ id, name, cls, weight, ncert, topics });

export const CHAPTERS = {
  physics: [
    ch('units', 'Units and Measurements', 11, 'L', ['keph1', 1, 7], ['SI units & base quantities', 'Significant figures & rounding off', 'Errors in measurement', 'Dimensions & dimensional analysis', 'Vernier calipers & screw gauge']),
    ch('straight-line', 'Motion in a Straight Line', 11, 'M', ['keph1', 2, 7], ['Displacement, velocity & acceleration', 'Equations of uniformly accelerated motion', 'Free fall & motion under gravity', 'Position–time & velocity–time graphs', 'Relative velocity in one dimension']),
    ch('plane', 'Motion in a Plane', 11, 'M', ['keph1', 3, 7], ['Vectors: addition, resolution & products', 'Projectile motion', 'Uniform circular motion', 'Relative velocity in two dimensions', 'River–boat & rain–man problems']),
    ch('laws-motion', 'Laws of Motion', 11, 'H', ['keph1', 4, 7], ["Newton's laws & inertia", 'Momentum & impulse', 'Free-body diagrams & connected bodies', 'Friction: static, kinetic & rolling', 'Circular motion: banking of roads']),
    ch('wep', 'Work, Energy and Power', 11, 'H', ['keph1', 5, 7], ['Work by constant & variable forces', 'Work–energy theorem', 'Potential energy & conservative forces', 'Power', 'Collisions: elastic & inelastic', 'Vertical circular motion']),
    ch('rotation', 'System of Particles and Rotational Motion', 11, 'H', ['keph1', 6, 7], ['Centre of mass', 'Torque & angular momentum', 'Moment of inertia: parallel & perpendicular axes', 'Rolling motion', 'Conservation of angular momentum', 'Equilibrium of rigid bodies']),
    ch('gravitation', 'Gravitation', 11, 'M', ['keph1', 7, 7], ["Newton's law of gravitation", 'Variation of g with height, depth & latitude', 'Gravitational potential & potential energy', 'Escape & orbital velocity', "Kepler's laws", 'Satellites & geostationary orbit']),
    ch('solids', 'Mechanical Properties of Solids', 11, 'L', ['keph2', 1, 7], ['Stress, strain & Hooke\'s law', 'Stress–strain curve', "Young's, bulk & shear modulus", "Poisson's ratio", 'Elastic potential energy']),
    ch('fluids', 'Mechanical Properties of Fluids', 11, 'M', ['keph2', 2, 7], ["Pressure & Pascal's law", 'Buoyancy & Archimedes\' principle', "Bernoulli's principle & continuity", 'Viscosity & Stokes\' law, terminal velocity', 'Surface tension, capillarity & excess pressure']),
    ch('thermal', 'Thermal Properties of Matter', 11, 'M', ['keph2', 3, 7], ['Temperature scales & thermal expansion', 'Specific heat & calorimetry', 'Latent heat & change of state', 'Conduction, convection & radiation', "Stefan's, Wien's & Newton's law of cooling"]),
    ch('thermodynamics', 'Thermodynamics', 11, 'H', ['keph2', 4, 7], ['Zeroth & first law', 'Isothermal, adiabatic, isobaric & isochoric processes', 'Work done in thermodynamic processes', 'Second law & heat engines', 'Carnot engine & refrigerators']),
    ch('ktg', 'Kinetic Theory', 11, 'M', ['keph2', 5, 7], ['Ideal gas equation', 'Pressure of an ideal gas', 'RMS, average & most probable speed', 'Degrees of freedom & equipartition', 'Specific heats of gases & mean free path']),
    ch('oscillations', 'Oscillations', 11, 'M', ['keph2', 6, 7], ['Periodic motion & SHM', 'Displacement, velocity & acceleration in SHM', 'Energy in SHM', 'Spring–mass system & simple pendulum', 'Damped & forced oscillations, resonance']),
    ch('waves', 'Waves', 11, 'M', ['keph2', 7, 7], ['Transverse & longitudinal waves', 'Speed of waves in strings & gases', 'Superposition & standing waves', 'Organ pipes & strings: harmonics', 'Beats', 'Doppler effect']),
    ch('charges-fields', 'Electric Charges and Fields', 12, 'H', ['leph1', 1, 8], ["Coulomb's law & superposition", 'Electric field & field lines', 'Electric dipole', "Gauss's law & electric flux", 'Fields of wire, sheet & shell']),
    ch('potential', 'Electrostatic Potential and Capacitance', 12, 'H', ['leph1', 2, 8], ['Electric potential & equipotential surfaces', 'Potential energy of charges & dipoles', 'Capacitors & capacitance', 'Series & parallel combinations', 'Dielectrics & energy stored']),
    ch('current', 'Current Electricity', 12, 'H', ['leph1', 3, 8], ["Ohm's law, resistivity & drift velocity", 'Combination of resistors', 'EMF, internal resistance & cells', "Kirchhoff's laws", 'Wheatstone bridge & metre bridge', 'Electrical power & energy']),
    ch('moving-charges', 'Moving Charges and Magnetism', 12, 'H', ['leph1', 4, 8], ['Lorentz force & motion in magnetic field', 'Biot–Savart law', "Ampère's circuital law & solenoid", 'Force between parallel currents', 'Torque on current loop & galvanometer', 'Ammeter & voltmeter conversion']),
    ch('magnetism', 'Magnetism and Matter', 12, 'L', ['leph1', 5, 8], ['Bar magnet & magnetic dipole', "Earth's magnetism", 'Magnetisation & intensity', 'Dia-, para- & ferromagnetism', 'Hysteresis']),
    ch('emi', 'Electromagnetic Induction', 12, 'M', ['leph1', 6, 8], ["Faraday's & Lenz's laws", 'Motional EMF', 'Eddy currents', 'Self & mutual induction', 'AC generator']),
    ch('ac', 'Alternating Current', 12, 'M', ['leph1', 7, 8], ['RMS & peak values', 'Reactance & impedance', 'LCR series circuit & resonance', 'Power & power factor', 'Transformers', 'LC oscillations']),
    ch('em-waves', 'Electromagnetic Waves', 12, 'L', ['leph1', 8, 8], ['Displacement current', 'Properties of EM waves', 'Electromagnetic spectrum & uses']),
    ch('ray-optics', 'Ray Optics and Optical Instruments', 12, 'H', ['leph2', 1, 6], ['Reflection & spherical mirrors', 'Refraction & total internal reflection', 'Lenses & lens maker\'s formula', 'Prism & dispersion', 'Microscope & telescope']),
    ch('wave-optics', 'Wave Optics', 12, 'M', ['leph2', 2, 6], ["Huygens' principle", "Young's double-slit experiment", 'Single-slit diffraction', 'Polarisation & Brewster\'s law', 'Resolving power']),
    ch('dual-nature', 'Dual Nature of Radiation and Matter', 12, 'H', ['leph2', 3, 6], ['Photoelectric effect', "Einstein's photoelectric equation", 'Stopping potential & threshold frequency', 'de Broglie wavelength', 'Davisson–Germer experiment']),
    ch('atoms', 'Atoms', 12, 'M', ['leph2', 4, 6], ['Rutherford\'s model & alpha scattering', 'Bohr model of hydrogen', 'Energy levels & spectral series', 'Ionisation energy']),
    ch('nuclei', 'Nuclei', 12, 'M', ['leph2', 5, 6], ['Nuclear size & density', 'Mass defect & binding energy', 'Binding energy per nucleon curve', 'Radioactivity & half-life', 'Nuclear fission & fusion']),
    ch('semiconductors', 'Semiconductor Electronics', 12, 'H', ['leph2', 6, 6], ['Intrinsic & extrinsic semiconductors', 'p–n junction & diode characteristics', 'Rectifiers', 'Zener diode & special diodes', 'Logic gates']),
  ],
  chemistry: [
    ch('basic-concepts', 'Some Basic Concepts of Chemistry', 11, 'M', ['kech1', 1, 6], ['Laws of chemical combination', 'Mole concept & molar mass', 'Empirical & molecular formula', 'Stoichiometry & limiting reagent', 'Concentration terms: molarity, molality, mole fraction']),
    ch('atomic-structure', 'Structure of Atom', 11, 'M', ['kech1', 2, 6], ['Bohr model & hydrogen spectrum', 'Dual nature & uncertainty principle', 'Quantum numbers', 'Shapes of orbitals & nodes', 'Aufbau, Pauli & Hund\'s rule; electronic configuration']),
    ch('periodicity', 'Classification of Elements and Periodicity in Properties', 11, 'M', ['kech1', 3, 6], ['Modern periodic law & table', 'Atomic & ionic radii', 'Ionisation enthalpy', 'Electron gain enthalpy & electronegativity', 'Periodic trends in chemical properties']),
    ch('bonding', 'Chemical Bonding and Molecular Structure', 11, 'H', ['kech1', 4, 6], ['Ionic & covalent bonds, Fajans\' rule', 'VSEPR theory & shapes', 'Hybridisation', 'Molecular orbital theory & bond order', 'Dipole moment', 'Hydrogen bonding']),
    ch('chem-thermo', 'Thermodynamics', 11, 'H', ['kech1', 5, 6], ['System, surroundings & state functions', 'First law: ΔU and ΔH', "Hess's law & enthalpies of reaction", 'Entropy & second law', 'Gibbs energy & spontaneity']),
    ch('equilibrium', 'Equilibrium', 11, 'H', ['kech1', 6, 6], ['Kp, Kc and the law of mass action', "Le Chatelier's principle", 'Acids, bases & pH', 'Ionisation of weak acids/bases', 'Buffer solutions & hydrolysis', 'Solubility product']),
    ch('redox', 'Redox Reactions', 11, 'L', ['kech2', 1, 3], ['Oxidation number', 'Types of redox reactions', 'Balancing redox equations', 'Redox titrations & n-factor']),
    ch('goc', 'Organic Chemistry: Some Basic Principles and Techniques', 11, 'H', ['kech2', 2, 3], ['IUPAC nomenclature', 'Isomerism: structural & stereo', 'Inductive, resonance & hyperconjugation', 'Carbocations, carbanions & free radicals', 'Purification & qualitative analysis', 'Quantitative analysis']),
    ch('hydrocarbons', 'Hydrocarbons', 11, 'M', ['kech2', 3, 3], ['Alkanes: preparation & conformations', 'Alkenes: Markovnikov & anti-Markovnikov', 'Alkynes: acidity & reactions', 'Aromaticity & benzene', 'Electrophilic substitution & directive influence']),
    ch('solutions', 'Solutions', 12, 'M', ['lech1', 1, 5], ["Henry's law & solubility", "Raoult's law & ideal solutions", 'Non-ideal solutions & azeotropes', 'Colligative properties', "Abnormal molar mass & van 't Hoff factor"]),
    ch('electrochemistry', 'Electrochemistry', 12, 'H', ['lech1', 2, 5], ['Galvanic cells & electrode potential', 'Nernst equation', 'Gibbs energy & EMF', 'Conductance & Kohlrausch\'s law', "Electrolysis & Faraday's laws", 'Batteries, fuel cells & corrosion']),
    ch('kinetics', 'Chemical Kinetics', 12, 'H', ['lech1', 3, 5], ['Rate of reaction & rate law', 'Order & molecularity', 'Integrated rate equations', 'Half-life', 'Arrhenius equation & activation energy', 'Collision theory']),
    ch('p-block', 'p-Block Elements (Groups 13–18)', 12, 'H', null, ['Group 13: boron family', 'Group 14: carbon family', 'Group 15: nitrogen family & oxoacids', 'Group 16: oxygen family', 'Group 17: halogens & interhalogens', 'Group 18: noble gases & xenon compounds']),
    ch('d-f-block', 'The d- and f-Block Elements', 12, 'H', ['lech1', 4, 5], ['Electronic configuration & general trends', 'Oxidation states & magnetic moments', 'Colour, catalysis & alloys', 'KMnO₄ & K₂Cr₂O₇', 'Lanthanoids & lanthanoid contraction', 'Actinoids']),
    ch('coordination', 'Coordination Compounds', 12, 'H', ['lech1', 5, 5], ["Werner's theory", 'Nomenclature', 'Isomerism in complexes', 'Valence bond theory', 'Crystal field theory & colour', 'Applications & stability']),
    ch('haloalkanes', 'Haloalkanes and Haloarenes', 12, 'M', ['lech2', 1, 5], ['Preparation & physical properties', 'SN1 & SN2 mechanisms', 'Elimination reactions', 'Reactions of haloarenes', 'Polyhalogen compounds']),
    ch('alcohols', 'Alcohols, Phenols and Ethers', 12, 'M', ['lech2', 2, 5], ['Preparation of alcohols & phenols', 'Acidity of alcohols & phenols', 'Reactions of alcohols', 'Reactions of phenols', 'Ethers: preparation & reactions']),
    ch('carbonyls', 'Aldehydes, Ketones and Carboxylic Acids', 12, 'H', ['lech2', 3, 5], ['Preparation of carbonyl compounds', 'Nucleophilic addition', 'Aldol & Cannizzaro reactions', 'Oxidation & reduction; tests', 'Carboxylic acids: acidity & reactions']),
    ch('amines', 'Amines', 12, 'M', ['lech2', 4, 5], ['Classification & nomenclature', 'Preparation of amines', 'Basicity of amines', 'Reactions & distinction tests', 'Diazonium salts']),
    ch('biomolecules-chem', 'Biomolecules', 12, 'M', ['lech2', 5, 5], ['Carbohydrates: glucose, fructose & disaccharides', 'Polysaccharides', 'Amino acids & proteins', 'Enzymes & vitamins', 'Nucleic acids']),
    ch('practical-chem', 'Principles Related to Practical Chemistry', 12, 'L', null, ['Detection of extra elements (N, S, halogens)', 'Functional group tests', 'Preparation of inorganic & organic compounds', 'Titrimetric exercises', 'Salt analysis: cations & anions']),
  ],
  botany: [
    ch('living-world', 'The Living World', 11, 'L', ['kebo1', 1, 19], ['Characteristics of living organisms', 'Biodiversity & need for classification', 'Binomial nomenclature', 'Taxonomic categories & hierarchy', 'Taxonomical aids']),
    ch('bio-classification', 'Biological Classification', 11, 'M', ['kebo1', 2, 19], ['Five-kingdom classification', 'Kingdom Monera', 'Kingdom Protista', 'Kingdom Fungi', 'Viruses, viroids & lichens']),
    ch('plant-kingdom', 'Plant Kingdom', 11, 'H', ['kebo1', 3, 19], ['Algae: green, brown & red', 'Bryophytes', 'Pteridophytes', 'Gymnosperms', 'Angiosperms', 'Plant life cycles & alternation of generations']),
    ch('morphology', 'Morphology of Flowering Plants', 11, 'H', ['kebo1', 5, 19], ['Root, stem & leaf modifications', 'Inflorescence', 'Flower: parts, symmetry & aestivation', 'Placentation', 'Fruit & seed', 'Families: Fabaceae, Solanaceae, Liliaceae']),
    ch('anatomy', 'Anatomy of Flowering Plants', 11, 'M', ['kebo1', 6, 19], ['Meristematic & permanent tissues', 'Tissue systems', 'Dicot & monocot root and stem', 'Dicot & monocot leaf', 'Secondary growth']),
    ch('cell', 'Cell: The Unit of Life', 11, 'H', ['kebo1', 8, 19], ['Cell theory', 'Prokaryotic cell', 'Cell membrane & cell wall', 'Endomembrane system', 'Mitochondria, plastids & ribosomes', 'Cytoskeleton, cilia, centrosome & nucleus']),
    ch('cell-cycle', 'Cell Cycle and Cell Division', 11, 'H', ['kebo1', 10, 19], ['Phases of the cell cycle', 'Mitosis', 'Meiosis I', 'Meiosis II', 'Significance of mitosis & meiosis']),
    ch('photosynthesis', 'Photosynthesis in Higher Plants', 11, 'H', ['kebo1', 11, 19], ['Pigments & action spectrum', 'Light reaction & photosystems', 'Electron transport & photophosphorylation', 'Calvin cycle (C₃)', 'C₄ pathway & photorespiration', 'Factors affecting photosynthesis']),
    ch('respiration', 'Respiration in Plants', 11, 'M', ['kebo1', 12, 19], ['Glycolysis', 'Fermentation', 'Krebs cycle', 'Electron transport system & oxidative phosphorylation', 'Respiratory balance sheet & RQ', 'Amphibolic pathway']),
    ch('plant-growth', 'Plant Growth and Development', 11, 'M', ['kebo1', 13, 19], ['Growth phases & growth rates', 'Differentiation, dedifferentiation & redifferentiation', 'Auxins & gibberellins', 'Cytokinins, ethylene & ABA', 'Development & plasticity']),
    ch('sexual-repro-plants', 'Sexual Reproduction in Flowering Plants', 12, 'H', ['lebo1', 1, 13], ['Microsporogenesis & pollen grain', 'Megasporogenesis & embryo sac', 'Pollination & outbreeding devices', 'Double fertilisation', 'Endosperm, embryo & seed', 'Apomixis & polyembryony']),
    ch('inheritance', 'Principles of Inheritance and Variation', 12, 'H', ['lebo1', 4, 13], ["Mendel's laws", 'Incomplete dominance & co-dominance', 'Multiple alleles & blood groups', 'Linkage & recombination', 'Sex determination', 'Mutation, pedigree & genetic disorders']),
    ch('molecular-basis', 'Molecular Basis of Inheritance', 12, 'H', ['lebo1', 5, 13], ['DNA structure & packaging', 'Search for genetic material', 'Replication', 'Transcription', 'Genetic code & translation', 'Lac operon, HGP & DNA fingerprinting']),
    ch('microbes', 'Microbes in Human Welfare', 12, 'M', ['lebo1', 8, 13], ['Microbes in household products', 'Industrial products', 'Sewage treatment', 'Biogas', 'Biocontrol agents & biofertilisers']),
    ch('organisms-populations', 'Organisms and Populations', 12, 'M', ['lebo1', 11, 13], ['Population attributes', 'Population growth: exponential & logistic', 'Life-history variation', 'Population interactions']),
    ch('ecosystem', 'Ecosystem', 12, 'H', ['lebo1', 12, 13], ['Structure & function', 'Productivity', 'Decomposition', 'Energy flow & food chains', 'Ecological pyramids']),
    ch('biodiversity', 'Biodiversity and Conservation', 12, 'M', ['lebo1', 13, 13], ['Levels of biodiversity', 'Patterns: latitudinal gradient & species–area', 'Importance of species diversity', 'Loss of biodiversity: the evil quartet', 'In situ & ex situ conservation']),
  ],
  zoology: [
    ch('animal-kingdom', 'Animal Kingdom', 11, 'H', ['kebo1', 4, 19], ['Basis of classification', 'Porifera, Cnidaria & Ctenophora', 'Platyhelminthes, Aschelminthes & Annelida', 'Arthropoda, Mollusca & Echinodermata', 'Hemichordata & Chordata', 'Vertebrate classes']),
    ch('structural-org', 'Structural Organisation in Animals', 11, 'M', ['kebo1', 7, 19], ['Epithelial tissue', 'Connective tissue', 'Muscular & neural tissue', 'Frog: morphology & anatomy']),
    ch('biomolecules', 'Biomolecules', 11, 'M', ['kebo1', 9, 19], ['Chemical analysis of tissues', 'Primary & secondary metabolites', 'Proteins & polysaccharides', 'Nucleic acids', 'Enzymes: classification, kinetics & inhibition']),
    ch('breathing', 'Breathing and Exchange of Gases', 11, 'M', ['kebo1', 14, 19], ['Human respiratory system', 'Mechanism of breathing', 'Respiratory volumes & capacities', 'Exchange & transport of gases', 'Regulation & disorders']),
    ch('body-fluids', 'Body Fluids and Circulation', 11, 'H', ['kebo1', 15, 19], ['Blood: composition & groups', 'Coagulation & lymph', 'Human heart', 'Cardiac cycle & ECG', 'Double circulation & regulation', 'Disorders of circulation']),
    ch('excretion', 'Excretory Products and their Elimination', 11, 'M', ['kebo1', 16, 19], ['Modes of excretion', 'Human excretory system & nephron', 'Urine formation', 'Counter-current mechanism', 'Regulation: ADH, RAAS & ANF', 'Disorders']),
    ch('locomotion', 'Locomotion and Movement', 11, 'M', ['kebo1', 17, 19], ['Types of movement & muscle', 'Structure of skeletal muscle', 'Sliding filament theory', 'Skeletal system', 'Joints & disorders']),
    ch('neural', 'Neural Control and Coordination', 11, 'M', ['kebo1', 18, 19], ['Neuron structure & types', 'Nerve impulse generation & conduction', 'Synaptic transmission', 'Central nervous system', 'Reflex action']),
    ch('chemical-coord', 'Chemical Coordination and Integration', 11, 'H', ['kebo1', 19, 19], ['Hypothalamus & pituitary', 'Pineal, thyroid & parathyroid', 'Thymus & adrenal', 'Pancreas & gonads', 'Hormones of heart, kidney & GI tract', 'Mechanism of hormone action']),
    ch('human-repro', 'Human Reproduction', 12, 'H', ['lebo1', 2, 13], ['Male reproductive system', 'Female reproductive system', 'Gametogenesis', 'Menstrual cycle', 'Fertilisation & implantation', 'Pregnancy, parturition & lactation']),
    ch('repro-health', 'Reproductive Health', 12, 'M', ['lebo1', 3, 13], ['Reproductive health in India', 'Population stabilisation & contraception', 'Medical termination of pregnancy', 'Sexually transmitted infections', 'Infertility & ART']),
    ch('evolution', 'Evolution', 12, 'M', ['lebo1', 6, 13], ['Origin of life', 'Evidences of evolution', 'Adaptive radiation', 'Darwinism & mutation theory', 'Hardy–Weinberg principle', 'Human evolution']),
    ch('health-disease', 'Human Health and Disease', 12, 'H', ['lebo1', 7, 13], ['Common diseases in humans', 'Immunity: innate & acquired', 'Vaccination & allergies', 'AIDS', 'Cancer', 'Drugs & alcohol abuse']),
    ch('biotech-principles', 'Biotechnology: Principles and Processes', 12, 'H', ['lebo1', 9, 13], ['Principles of biotechnology', 'Restriction enzymes', 'Cloning vectors & pBR322', 'Competent hosts & gene transfer', 'PCR, gel electrophoresis & bioreactors']),
    ch('biotech-applications', 'Biotechnology and its Applications', 12, 'H', ['lebo1', 10, 13], ['Bt crops & pest resistance', 'RNA interference', 'Genetically engineered insulin', 'Gene therapy & molecular diagnosis', 'Transgenic animals', 'Ethical issues & biopiracy']),
  ],
};

export const chaptersOf = (sub) => CHAPTERS[sub] || [];
export const chapterById = (sub, id) => chaptersOf(sub).find((c) => c.id === id) || null;
export const allChapters = () => SUBJECTS.flatMap((s) => chaptersOf(s.id).map((c) => ({ ...c, subject: s.id })));
export const ncertUrl = (c) => (c?.ncert ? `https://ncert.nic.in/textbook.php?${c.ncert[0]}=${c.ncert[1]}-${c.ncert[2]}` : null);
export const WEIGHT_LABEL = { H: 'High weightage', M: 'Medium weightage', L: 'Low weightage' };

export const HABITS = [
  { id: 'ncert', emoji: '📗', title: 'NCERT reading', hint: 'Line by line, one chapter section' },
  { id: 'mcq', emoji: '🎯', title: 'MCQ practice', hint: '50+ questions' },
  { id: 'revision', emoji: '🔁', title: 'Revision', hint: "Revise yesterday's topics" },
  { id: 'formulas', emoji: '🧮', title: 'Formula & reaction revision', hint: 'Physics formulas, named reactions' },
  { id: 'diagrams', emoji: '🔬', title: 'Diagram practice', hint: 'Draw one NCERT diagram' },
  { id: 'pyq', emoji: '📝', title: 'PYQs', hint: 'Previous-year NEET questions' },
];

export const TIPS = [
  'NCERT is the syllabus for Biology. Read every line, every diagram label and every table — NEET picks statements straight from them.',
  'Solve previous-year NEET questions chapter by chapter before you start mock tests. They show you exactly what gets asked.',
  'Physics improves with practice, not reading. After each concept, solve 20 numericals before moving on.',
  'In Chemistry, Inorganic is memory, Organic is mechanism, Physical is numericals. Plan each one differently.',
  'NEET has −1 for a wrong answer. If you can eliminate two options, guess; if not, skip.',
  'Analyse every mock test for twice the time you took to write it. Your mistakes are your syllabus.',
  'Keep a "formula + reaction" sheet per chapter and revise it every morning for 15 minutes.',
  'Revise on a 1–3–7–21 day cycle. A chapter revised four times is a chapter you own in the exam hall.',
  'Sleep 7 hours. Memory consolidates while you rest — late nights cost marks.',
  'Attempt Biology first in the exam (90 questions, 360 marks) to build momentum, then Chemistry, then Physics.',
  'Mark the NCERT lines you get wrong in quizzes. Those highlighted lines are your last-week revision.',
  'One source, many revisions: finish NCERT + one question bank thoroughly rather than five books halfway.',
];

export const LIBRARY = [
  // Official
  { id: 'nta-neet', cat: 'Official', title: 'NTA NEET (UG) website', desc: 'Information bulletin, registration, admit card, answer key and results.', url: 'https://neet.nta.nic.in', type: 'web', subject: 'general' },
  { id: 'nmc-syllabus', cat: 'Official', title: 'NMC — National Medical Commission', desc: 'The NEET (UG) syllabus is notified by the NMC. Check for updates.', url: 'https://www.nmc.org.in', type: 'web', subject: 'general' },
  { id: 'ncert', cat: 'Official', title: 'NCERT textbooks (Class 11–12)', desc: 'Physics, Chemistry and Biology — the base of every NEET question. Free.', url: 'https://ncert.nic.in/textbook.php', type: 'pdf', subject: 'general' },
  { id: 'ncert-exemplar', cat: 'Official', title: 'NCERT Exemplar problems', desc: 'Higher-order questions on every NCERT chapter.', url: 'https://ncert.nic.in/exemplar-problems.php', type: 'pdf', subject: 'general' },
  { id: 'abhyas', cat: 'Official', title: 'NTA practice tests', desc: 'Official mock tests from NTA for practice in the real exam interface.', url: 'https://nta.ac.in', type: 'web', subject: 'general' },
  { id: 'mcc', cat: 'Official', title: 'Medical Counselling Committee (MCC)', desc: 'All-India quota counselling after results.', url: 'https://mcc.nic.in', type: 'web', subject: 'general' },
  // Free learning
  { id: 'diksha', cat: 'Free Learning', title: 'DIKSHA', desc: 'Government platform with NCERT-aligned lessons and videos.', url: 'https://diksha.gov.in', type: 'video', subject: 'general' },
  { id: 'epathshala', cat: 'Free Learning', title: 'NCERT ePathshala', desc: 'Digital NCERT books and audio-visual resources.', url: 'https://epathshala.nic.in', type: 'web', subject: 'general' },
  { id: 'swayam', cat: 'Free Learning', title: 'SWAYAM Prabha', desc: 'Free educational TV channels for Class 11–12 science (IIT-PAL).', url: 'https://swayamprabha.gov.in', type: 'video', subject: 'general' },
  { id: 'phet', cat: 'Free Learning', title: 'PhET simulations', desc: 'Interactive physics and chemistry simulations from the University of Colorado.', url: 'https://phet.colorado.edu', type: 'web', subject: 'physics' },
  // Books: Physics
  { id: 'b-hcv', cat: 'Physics Books', title: 'Concepts of Physics — H.C. Verma', desc: 'Concept-building and solved examples. Do the objective sections.', type: 'book', subject: 'physics' },
  { id: 'b-dcp', cat: 'Physics Books', title: 'Objective Physics — D.C. Pandey', desc: 'Large bank of NEET-level MCQs, chapter-wise.', type: 'book', subject: 'physics' },
  // Books: Chemistry
  { id: 'b-ncert-chem', cat: 'Chemistry Books', title: 'NCERT Chemistry (Class 11 & 12)', desc: 'Inorganic and organic questions come almost line by line from here.', type: 'book', subject: 'chemistry' },
  { id: 'b-mschouhan', cat: 'Chemistry Books', title: 'Organic Chemistry — M.S. Chouhan', desc: 'Practice problems for reactions and mechanisms.', type: 'book', subject: 'chemistry' },
  { id: 'b-nsharma', cat: 'Chemistry Books', title: 'Physical Chemistry — N. Awasthi', desc: 'Numericals for mole concept, equilibrium, kinetics and more.', type: 'book', subject: 'chemistry' },
  // Books: Biology
  { id: 'b-ncert-bio', cat: 'Biology Books', title: 'NCERT Biology (Class 11 & 12)', desc: 'Read it at least five times. Diagrams, tables and examples included.', type: 'book', subject: 'botany' },
  { id: 'b-trueman', cat: 'Biology Books', title: "Trueman's Elementary Biology", desc: 'Extra depth on NCERT topics when you need it.', type: 'book', subject: 'zoology' },
  { id: 'b-fingertips', cat: 'Biology Books', title: 'Objective NCERT at your Fingertips (Biology)', desc: 'NCERT-line MCQs for every chapter.', type: 'book', subject: 'botany' },
  // PYQs
  { id: 'b-pyq', cat: 'Practice', title: 'NEET chapter-wise previous-year papers (any reputed publisher)', desc: 'Solve the last 10+ years chapter-wise, then as full papers.', type: 'book', subject: 'general' },
];

export const PRESET_REMINDERS = [
  { title: 'Morning formula & reaction revision', time: '06:30', repeat: 'daily', emoji: '🧮' },
  { title: 'Biology NCERT reading block', time: '08:00', repeat: 'daily', emoji: '📗' },
  { title: 'Physics numericals practice', time: '16:00', repeat: 'weekdays', emoji: '⚛️' },
  { title: "Revise today's chapter", time: '21:30', repeat: 'daily', emoji: '🔁' },
  { title: 'Full-length NEET mock test', time: '14:00', repeat: 'weekly', days: [0], emoji: '🎯' },
];
