<?php

namespace App\utils;

use RobRichards\XMLSecLibs\XMLSecurityDSig;
use RobRichards\XMLSecLibs\XMLSecurityKey;
use DOMDocument;

class Signer
{
    public function firmarXML(string $xmlContent, string $certPath, string $certPassword): string
    {
        $doc = new DOMDocument();
        $doc->loadXML($xmlContent);

        $objDSig = new XMLSecurityDSig();
        $objDSig->setCanonicalMethod(XMLSecurityDSig::EXC_C14N);
        $objDSig->addReference(
            $doc,
            XMLSecurityDSig::SHA256,
            ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
            ['force_uri' => true]
        );

        $objKey = new XMLSecurityKey(XMLSecurityKey::RSA_SHA256, ['type' => 'private']);

        if (!openssl_pkcs12_read(file_get_contents($certPath), $certs, $certPassword)) {
            throw new \Exception("No se pudo leer el certificado. Verifica la contraseña.");
        }

        $objKey->loadKey($certs['pkey']);
        $objDSig->sign($objKey);
        $objDSig->add509Cert($certs['cert']);

        $objDSig->appendSignature($doc->documentElement);

        return $doc->saveXML();
    }
}
