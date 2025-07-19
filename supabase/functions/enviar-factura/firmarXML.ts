// RUTA: supabase/functions/enviar-factura/firmarXML.ts (Versión final con extracción de llave robusta)

import { SignedXml } from 'npm:xml-crypto';
import forge from 'npm:node-forge';

export function firmarXML(xmlSinFirmar: string): string {
  const p12Base64 = Deno.env.get('P12_BASE64')?.trim();
  const p12Password = Deno.env.get('P12_PASSWORD');

  if (!p12Base64 || !p12Password) {
    throw new Error('Certificado P12 o contraseña no encontrados en las variables de entorno.');
  }

  try {
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);

    // --- CORRECCIÓN FINAL: Método más robusto para extraer la llave privada ---
    let privateKey;
    for (const bag of p12.safeContents) {
      if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag && bag.key) {
        privateKey = bag.key;
        break; 
      }
      if (bag.type === forge.pki.oids.keyBag && bag.key) {
        privateKey = bag.key;
        break;
      }
    }

    if (!privateKey) {
      throw new Error("No se pudo extraer la llave privada del archivo .p12, aunque el archivo y la contraseña son correctos.");
    }
    
    const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error("No se pudo extraer el certificado del archivo .p12.");
    
    const cert = certBag.cert;
    // --- FIN DE LA CORRECCIÓN ---

    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    const sig = new SignedXml();
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.signingKey = privateKeyPem;

    sig.addReference({
      xpath: "//*[local-name(.)='FacturaElectronica']",
      transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    });
    
    sig.keyInfoProvider = {
      getKeyInfo: () => {
          const certDerBytes = forge.pki.certificateToAsn1(cert).toDer().getBytes();
          const certBase64 = forge.util.encode64(certDerBytes);
          return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
      }
    };

    sig.computeSignature(xmlSinFirmar);
    return sig.getSignedXml();

  } catch (error) {
    throw error;
  }
}