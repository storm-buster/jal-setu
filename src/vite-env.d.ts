/// <reference types="vite/client" />

declare module 'geotiff' {
    export type GeoTIFFImage = {
        getWidth(): number;
        getHeight(): number;
        getSamplesPerPixel(): number;
    };

    export type GeoTIFF = {
        getImage(): Promise<GeoTIFFImage>;
    };

    export function fromArrayBuffer(buffer: ArrayBuffer): Promise<GeoTIFF>;
}
