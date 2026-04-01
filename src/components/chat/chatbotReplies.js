/**
 * Réponses locales (MVP) — à remplacer ou compléter par VITE_CHATBOT_API_URL (POST JSON { message } → { reply }).
 */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * @param {string} userText
 * @returns {string}
 */
export function getLocalBotReply(userText) {
  const t = norm(userText)

  if (!t.trim()) {
    return 'Posez-moi une question : réservations, paiement, compte ou événements sur ALL EVENT.'
  }

  if (/^(bonjour|salut|hello|hey|coucou|bonsoir)\b/.test(t) || t.length < 8) {
    return "Bonjour ! Je suis l'assistant ALL EVENT. Je peux vous orienter sur les réservations, le paiement, votre compte ou le fonctionnement de la plateforme. Que souhaitez-vous savoir ?"
  }

  if (/merci|thanks/.test(t)) {
    return 'Avec plaisir ! N’hésitez pas si vous avez une autre question.'
  }

  if (/reservation|reserve|billet|commande|ticket|panier|checkout/.test(t)) {
    return "Les réservations passent par votre panier : choisissez un créneau, validez puis finalisez le paiement (simulation disponible selon l’environnement). Vos billets et l’historique sont dans la section « Billets » / Réservations une fois connecté."
  }

  if (/paiement|payer|carte|stripe|espece|mad/.test(t)) {
    return "Le paiement dépend de la configuration du site : en démo, un paiement simulé peut être proposé après réservation. Pour un problème de transaction, précisez la date et le montant ; notre équipe pourra vérifier côté support."
  }

  if (/annul|rembours|litige|plainte/.test(t)) {
    return "Pour une annulation ou un remboursement, les règles dépendent de l’activité et du délai. Connectez-vous, ouvrez la réservation concernée et suivez les options proposées, ou contactez le support avec votre numéro de réservation."
  }

  if (/compte|inscription|mot de passe|password|connect|login|profil/.test(t)) {
    return "Créez un compte via « S’inscrire », ou connectez-vous avec votre e-mail. Vous pouvez gérer votre profil et vos données depuis l’espace compte une fois connecté."
  }

  if (/prestataire|pro|vendeur|organisateur|structure/.test(t)) {
    return "Pour proposer vos activités sur ALL EVENT, utilisez l’espace prestataire (inscription dédiée). Vous pourrez gérer activités, créneaux et réservations reçues."
  }

  if (/faq|aide|comment|how|contact|support|humain|agent|email|telephone|tel/.test(t)) {
    return "Notre FAQ publique couvre les questions fréquentes. Pour un cas précis, contactez le support ALL EVENT depuis les mentions légales / contact du site ou répondez ici avec un maximum de détails (réservation, e-mail du compte)."
  }

  if (/ville|lieu|douala|yaounde|localisation/.test(t)) {
    return "Le catalogue est filtrable par ville : choisissez votre ville dans l’en-tête pour voir les activités disponibles près de vous."
  }

  return "Je n’ai pas trouvé de réponse automatique exacte. Reformulez en une phrase (ex. « problème de paiement réservation 123 ») ou consultez la page FAQ. Notre équipe peut aussi vous répondre via les canaux indiqués sur le site."
}
