const fs = require('fs');

const frAbout = {
  "title1": "Des soins de santé simplifiés",
  "title2": "Simples et fiables",
  "heroDesc": "INSAT met en relation les patients avec les meilleurs psychothérapeutes et cliniques d'Algérie, rendant ainsi des soins de santé de qualité accessibles à tous grâce à la technologie.",
  "missionLabel": "Notre Mission",
  "missionTitle": "Révolutionner l'Accès aux Soins de Santé en Algérie",
  "missionDesc1": "Fondée avec la vision de faciliter l'accès aux soins pour les patients, INSAT est la plateforme de santé numérique leader en Algérie.",
  "missionDesc2": "Notre plateforme héberge des centaines de psychothérapeutes vérifiés, offrant des consultations en personne et en ligne.",
  "stat1": "Psychothérapeutes Vérifiés",
  "stat2": "Patients Satisfaits",
  "stat3": "Wilayas Couvertes",
  "stat4": "Note Moyenne",
  "valuesLabel": "Nos Valeurs",
  "valuesTitle": "Ce Que Nous Défendons",
  "v1Title": "Le Patient d'Abord",
  "v1Desc": "Tout ce que nous faisons est conçu pour le bien-être et le confort des patients.",
  "v2Title": "Confiance et Sécurité",
  "v2Desc": "Tous les médecins sont des professionnels vérifiés. Vos données de santé sont cryptées et sécurisées.",
  "v3Title": "Communauté",
  "v3Desc": "Construire une communauté de soins de santé connectée à travers l'Algérie.",
  "v4Title": "Excellence",
  "v4Desc": "Nous nous associons uniquement avec les cliniques et les médecins les mieux notés.",
  "v5Title": "Accessibilité",
  "v5Desc": "Rendre des soins de santé de qualité accessibles à tous, partout.",
  "v6Title": "Innovation",
  "v6Desc": "Amélioration continue grâce à la technologie et aux retours des patients."
};

const arAbout = {
  "title1": "رعاية صحية مبسطة",
  "title2": "بسيطة وموثوقة",
  "heroDesc": "تربط INSAT المرضى بأفضل المعالجين النفسيين والعيادات في الجزائر، مما يجعل الرعاية الصحية الجيدة في متناول الجميع من خلال التكنولوجيا.",
  "missionLabel": "مهمتنا",
  "missionTitle": "إحداث ثورة في الوصول إلى الرعاية الصحية في الجزائر",
  "missionDesc1": "تأسست INSAT برؤية لتسهيل وصول المرضى إلى الرعاية، وهي المنصة الرقمية الرائدة للصحة في الجزائر.",
  "missionDesc2": "تستضيف منصتنا مئات المعالجين النفسيين المعتمدين، وتقدم استشارات شخصية وعبر الإنترنت.",
  "stat1": "معالج نفسي معتمد",
  "stat2": "مريض راضٍ",
  "stat3": "ولاية مغطاة",
  "stat4": "متوسط التقييم",
  "valuesLabel": "قيمنا",
  "valuesTitle": "ما ندافع عنه",
  "v1Title": "المريض أولاً",
  "v1Desc": "كل ما نقوم به مصمم لرفاهية وراحة المرضى.",
  "v2Title": "الثقة والأمان",
  "v2Desc": "جميع الأطباء محترفون معتمدون. بياناتك الصحية مشفرة وآمنة.",
  "v3Title": "المجتمع",
  "v3Desc": "بناء مجتمع رعاية صحية متصل في جميع أنحاء الجزائر.",
  "v4Title": "التميز",
  "v4Desc": "نحن نتشارك فقط مع العيادات والأطباء الأعلى تقييمًا.",
  "v5Title": "سهولة الوصول",
  "v5Desc": "جعل الرعاية الصحية عالية الجودة في متناول الجميع، في كل مكان.",
  "v6Title": "الابتكار",
  "v6Desc": "التحسين المستمر من خلال التكنولوجيا وملاحظات المرضى."
};

const enAbout = {
  "title1": "Healthcare Simplified",
  "title2": "Simple and Reliable",
  "heroDesc": "INSAT connects patients with the best psychotherapists and clinics in Algeria, making quality healthcare accessible to everyone through technology.",
  "missionLabel": "Our Mission",
  "missionTitle": "Revolutionizing Healthcare Access in Algeria",
  "missionDesc1": "Founded with the vision to make healthcare access easier for patients, INSAT is the leading digital health platform in Algeria.",
  "missionDesc2": "Our platform hosts hundreds of verified psychotherapists, offering in-person and online consultations.",
  "stat1": "Verified Psychotherapists",
  "stat2": "Satisfied Patients",
  "stat3": "Wilayas Covered",
  "stat4": "Average Rating",
  "valuesLabel": "Our Values",
  "valuesTitle": "What We Stand For",
  "v1Title": "Patient First",
  "v1Desc": "Everything we do is designed for the well-being and comfort of patients.",
  "v2Title": "Trust and Security",
  "v2Desc": "All doctors are verified professionals. Your health data is encrypted and secure.",
  "v3Title": "Community",
  "v3Desc": "Building a connected healthcare community across Algeria.",
  "v4Title": "Excellence",
  "v4Desc": "We partner only with top-rated clinics and doctors.",
  "v5Title": "Accessibility",
  "v5Desc": "Making quality healthcare accessible to everyone, everywhere.",
  "v6Title": "Innovation",
  "v6Desc": "Continuous improvement through technology and patient feedback."
};

const updateFile = (file, data) => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  content.about = data;
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
};

updateFile('frontend/public/locales/fr/translation.json', frAbout);
updateFile('frontend/public/locales/ar/translation.json', arAbout);
updateFile('frontend/public/locales/en/translation.json', enAbout);
console.log('Translations updated');
