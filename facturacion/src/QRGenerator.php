<?php
class QRGenerator {
    
    public static function generateQRBase64($data, $size = 150) {
        // Crear QR simple usando caracteres
        $qrMatrix = self::generateQRMatrix($data);
        return self::matrixToBase64($qrMatrix, $size);
    }
    
    private static function generateQRMatrix($data) {
        // QR simple de 21x21 (versión 1)
        $size = 21;
        $matrix = array_fill(0, $size, array_fill(0, $size, 0));
        
        // Patrones de posición (esquinas)
        $positions = [[0, 0], [0, 14], [14, 0]];
        foreach ($positions as $pos) {
            self::addFinderPattern($matrix, $pos[0], $pos[1]);
        }
        
        // Datos simplificados
        $hash = md5($data);
        for ($i = 0; $i < strlen($hash) && $i < 100; $i++) {
            $x = ($i * 3) % 19 + 1;
            $y = ($i * 7) % 19 + 1;
            $matrix[$y][$x] = hexdec($hash[$i]) % 2;
        }
        
        return $matrix;
    }
    
    private static function addFinderPattern(&$matrix, $x, $y) {
        // Patrón 7x7 de finder
        for ($dy = 0; $dy < 7; $dy++) {
            for ($dx = 0; $dx < 7; $dx++) {
                if ($x + $dx < 21 && $y + $dy < 21) {
                    $pattern = [
                        [1,1,1,1,1,1,1],
                        [1,0,0,0,0,0,1],
                        [1,0,1,1,1,0,1],
                        [1,0,1,1,1,0,1],
                        [1,0,1,1,1,0,1],
                        [1,0,0,0,0,0,1],
                        [1,1,1,1,1,1,1]
                    ];
                    $matrix[$y + $dy][$x + $dx] = $pattern[$dy][$dx];
                }
            }
        }
    }
    
    private static function matrixToBase64($matrix, $size) {
        $pixelSize = $size / 21;
        $imageSize = $pixelSize * 21;
        
        // Crear imagen
        $image = imagecreate($imageSize, $imageSize);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        
        // Rellenar
        imagefill($image, 0, 0, $white);
        
        // Dibujar QR
        for ($y = 0; $y < 21; $y++) {
            for ($x = 0; $x < 21; $x++) {
                if ($matrix[$y][$x]) {
                    imagefilledrectangle(
                        $image,
                        $x * $pixelSize,
                        $y * $pixelSize,
                        ($x + 1) * $pixelSize - 1,
                        ($y + 1) * $pixelSize - 1,
                        $black
                    );
                }
            }
        }
        
        // Convertir a base64
        ob_start();
        imagepng($image);
        $imageData = ob_get_contents();
        ob_end_clean();
        imagedestroy($image);
        
        return 'data:image/png;base64,' . base64_encode($imageData);
    }
}
?>