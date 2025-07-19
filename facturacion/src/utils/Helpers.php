<?php

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function xmlToBase64($xmlString) {
    return base64_encode($xmlString);
}
