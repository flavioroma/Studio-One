

import * as piexif from 'piexifjs';

export interface PhotoMetadata {
    width?: number;
    height?: number;
    creationTime?: Date;
    latitude?: number;
    longitude?: number;
}

export interface VideoMetadata {
    width: number;
    height: number;
    duration: number; // seconds
    bitrate: number; // bps (calculated)
    framerate?: number; // Estimated or N/A
    creationTime?: Date;
}

export class MetadataService {

    // --- Photo Metadata Reading ---
    static async getPhotoMetadata(file: File): Promise<PhotoMetadata> {
        return new Promise(async (resolve) => {
            try {
                // piexifjs requires DataURL
                const dataUrl = await MetadataService.fileToDataURL(file);

                // piexif.load returns an object with "0th", "Exif", "GPS", "Interop", "1st", "thumbnail"
                const exifObj = piexif.load(dataUrl);

                // Helper to get tag value safely
                const getTag = (ifd: any, tag: number) => {
                    return ifd && ifd[tag];
                };

                const exif = exifObj["Exif"];
                const gps = exifObj["GPS"];
                const zero = exifObj["0th"];

                // Dimensions (PixelXDimension, PixelYDimension)
                // Sometimes in Exif (40962/40963), sometimes in 0th (ImageWidth/ImageLength)
                let width = getTag(exif, piexif.ExifIFD.PixelXDimension) || getTag(zero, piexif.ImageIFD.ImageWidth);
                let height = getTag(exif, piexif.ExifIFD.PixelYDimension) || getTag(zero, piexif.ImageIFD.ImageLength);

                // Dates (DateTimeOriginal=36867, DateTimeDigitized=36868, DateTime=306)
                const dateTimeOriginal = getTag(exif, piexif.ExifIFD.DateTimeOriginal);
                const dateTimeDigitized = getTag(exif, piexif.ExifIFD.DateTimeDigitized);
                const dateTime = getTag(zero, piexif.ImageIFD.DateTime);




                const dateStr = dateTimeOriginal || dateTimeDigitized || dateTime;

                // GPS Coords
                // Latitude=2, LatitudeRef=1, Longitude=4, LongitudeRef=3
                const lat = getTag(gps, piexif.GPSIFD.GPSLatitude);
                const latRef = getTag(gps, piexif.GPSIFD.GPSLatitudeRef);
                const lon = getTag(gps, piexif.GPSIFD.GPSLongitude);
                const lonRef = getTag(gps, piexif.GPSIFD.GPSLongitudeRef);

                let latitude, longitude;


                if (lat && latRef && lon && lonRef) {
                    latitude = MetadataService.convertDMSToDD(lat, latRef);
                    longitude = MetadataService.convertDMSToDD(lon, lonRef);
                }

                let creationTime: Date | undefined;
                if (dateStr) {
                    const str = dateStr.toString().trim();


                    // Match "YYYY:MM:DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS" or "YYYY/MM/DD..."
                    const match = str.match(/^(\d{4})[:\-\/](\d{2})[:\-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);

                    if (match) {
                        const year = parseInt(match[1]);
                        const month = parseInt(match[2]) - 1;
                        const day = parseInt(match[3]);
                        const hour = parseInt(match[4]);
                        const minute = parseInt(match[5]);
                        const second = parseInt(match[6]);

                        creationTime = new Date(year, month, day, hour, minute, second);

                    } else {

                    }
                } else {

                }

                resolve({
                    width: width ? Number(width) : undefined,
                    height: height ? Number(height) : undefined,
                    creationTime,
                    latitude,
                    longitude
                });
            } catch (err) {
                console.warn("[MetadataService] Error reading EXIF with piexifjs:", err);
                // Fallback to basic image properties if EXIF fails or not JPEG
                const img = new Image();
                img.onload = () => {
                    resolve({
                        width: img.width,
                        height: img.height
                    });
                };
                img.onerror = () => resolve({});
                img.src = URL.createObjectURL(file);
            }
        });
    }

    private static convertDMSToDD(dms: any[], ref: string): number {
        // piexifjs returns dms as an array of 3 rationals: [[n1,d1], [n2,d2], [n3,d3]]
        // or sometimes simple numbers if previously processed? But usually rationals.

        const deg = Array.isArray(dms[0]) ? dms[0][0] / dms[0][1] : Number(dms[0]);
        const min = Array.isArray(dms[1]) ? dms[1][0] / dms[1][1] : Number(dms[1]);
        const sec = Array.isArray(dms[2]) ? dms[2][0] / dms[2][1] : Number(dms[2]);

        let dd = deg + min / 60 + sec / 3600;

        if (ref === "S" || ref === "W") {
            dd = dd * -1;
        }
        return dd;
    }

    // --- Video Metadata Reading ---
    static async getVideoMetadata(file: File): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            // Set a timeout for loading metadata (e.g., 5 seconds)
            // This handles cases where the browser might stall or not trigger an error event for certain codecs
            const timeoutId = setTimeout(() => {
                video.onloadedmetadata = null;
                video.onerror = null;
                URL.revokeObjectURL(video.src);
                reject("Video metadata loading timed out. The format might be unsupported.");
            }, 5000);

            video.onloadedmetadata = async () => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(video.src);
                const duration = video.duration;
                // Calculate bitrate: Total Bytes * 8 / Duration (seconds)
                const bitrate = (file.size * 8) / duration;

                // Attempt to extract creation time
                let creationTime: Date | undefined;
                try {
                    creationTime = await MetadataService.getMp4CreationTime(file);
                } catch (e) {
                    console.warn("Could not extract creation time", e);
                }

                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: duration,
                    bitrate: Math.round(bitrate),
                    framerate: undefined,
                    creationTime
                });
            };
            video.onerror = () => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(video.src);
                reject("Failed to load video metadata. The format or codec might be unsupported.");
            };
            video.src = URL.createObjectURL(file);
        });
    }

    // --- MP4/MOV Atom Parsing for Creation Time ---
    private static async getMp4CreationTime(file: File): Promise<Date | undefined> {
        let offset = 0;
        const fileSize = file.size;

        while (offset < fileSize) {
            // Read atom header (8 bytes)
            const headerBlob = file.slice(offset, offset + 8);
            const headerBuffer = await headerBlob.arrayBuffer();

            if (headerBuffer.byteLength < 8) break;

            const view = new DataView(headerBuffer);
            let size = view.getUint32(0); // Big-endian
            const type = String.fromCharCode(
                view.getUint8(4),
                view.getUint8(5),
                view.getUint8(6),
                view.getUint8(7)
            );

            // Handle "extended size" (size = 1) -> read next 8 bytes
            let headerSize = 8;
            if (size === 1) {
                const largeSizeBlob = file.slice(offset + 8, offset + 16);
                const largeSizeBuffer = await largeSizeBlob.arrayBuffer();
                const largeSizeView = new DataView(largeSizeBuffer);

                // JS raw numbers lose precision > 2^53, but file sizes usually fit.
                // High 32 + Low 32.
                const high = largeSizeView.getUint32(0);
                const low = largeSizeView.getUint32(4);

                // Safe approximation for size in JS number
                size = (high * 4294967296) + low;
                headerSize = 16;
            }

            if (type === 'moov') {
                // Found moov container! Now look for mvhd inside.
                // We'll search efficiently by reading chunks of moov if needed, 
                // but usually moov isn't massive. Let's iterate its children.
                // The 'moov' body starts at offset + headerSize

                const moovEnd = offset + size;
                let subOffset = offset + headerSize;

                while (subOffset < moovEnd) {
                    const subHeaderBlob = file.slice(subOffset, subOffset + 8);
                    const subHeaderBuffer = await subHeaderBlob.arrayBuffer();

                    if (subHeaderBuffer.byteLength < 8) break;

                    const subView = new DataView(subHeaderBuffer);
                    const subSize = subView.getUint32(0);
                    const subType = String.fromCharCode(
                        subView.getUint8(4),
                        subView.getUint8(5),
                        subView.getUint8(6),
                        subView.getUint8(7)
                    );

                    if (subType === 'mvhd') {
                        // Found it! Read the header data.
                        // We need about 20-30 bytes to be safe.
                        const mvhdBlob = file.slice(subOffset + 8, subOffset + 30);
                        const mvhdBuffer = await mvhdBlob.arrayBuffer();
                        const data = new DataView(mvhdBuffer);

                        // Version (1 byte)
                        const version = data.getUint8(0);
                        // Flags (3 bytes) - skipped (offset 1,2,3)

                        // Offset to creation_time
                        // If version 1 (64-bit): 4 (header) + 8 (creation)
                        // If version 0 (32-bit): 4 (header) + 4 (creation) - NOTE: 'header' here means version+flags (4 bytes)

                        let timeOffset = 4; // Skip Version(1) + Flags(3)

                        let creationTimeRaw: number;
                        if (version === 1) {
                            const high = data.getUint32(timeOffset);
                            const low = data.getUint32(timeOffset + 4);
                            creationTimeRaw = (high * 4294967296) + low;
                        } else {
                            creationTimeRaw = data.getUint32(timeOffset);
                        }

                        const diff = 2082844800; // Seconds between 1904-01-01 and 1970-01-01
                        const unixTime = creationTimeRaw - diff;
                        const date = new Date(unixTime * 1000);

                        // Validity check: 
                        // Windows typically only shows "Media Created" if it's set to a sensible value.
                        // Standard web downloads often have 0 or very old defaults (1904 or 1970).
                        // Youtube launched in 2005, so valid digital video metadata is likely > 2000.
                        if (date.getFullYear() < 2000) {
                            return undefined;
                        }

                        return date;
                    }

                    subOffset += subSize;
                }

                // If we finished moov and didn't find mvhd, stop?
                return undefined;
            }

            // Skip this atom
            if (size === 0) {
                // 0 means "rest of file", usually mdat at end
                break;
            }

            offset += size;
        }

        return undefined;
    }

    // --- Photo Metadata Transfer (Writing) ---
    static async transferPhotoMetadata(sourceFile: File, destBlob: Blob): Promise<Blob> {
        // 1. Read EXIF from Source as Binary String
        const sourceDataUrl = await MetadataService.fileToDataURL(sourceFile);
        const sourceExifObj = piexif.load(sourceDataUrl);

        // 2. Read Dest Blob as DataURL
        const destDataUrl = await MetadataService.blobToDataURL(destBlob);

        // 3. Insert EXIF
        // Note: We might want to remove "Thumbnail" data to save space/avoid conflicts
        if (sourceExifObj["thumbnail"]) {
            delete sourceExifObj["thumbnail"];
        }

        // Fix Orientation: Canvas export produces upright pixels.
        // We must reset Orientation to 1 (Normal) so viewers don't rotate it again.
        if (sourceExifObj["0th"]) {
            sourceExifObj["0th"][piexif.ImageIFD.Orientation] = 1;
        }

        const exifStr = piexif.dump(sourceExifObj);
        const newJpeg = piexif.insert(exifStr, destDataUrl);

        // 4. Convert back to Blob
        return MetadataService.dataURLToBlob(newJpeg);
    }

    // --- Helpers ---
    private static fileToDataURL(file: File): Promise<string> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });
    }

    private static blobToDataURL(blob: Blob): Promise<string> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(blob);
        });
    }

    private static dataURLToBlob(dataurl: string): Blob {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}
