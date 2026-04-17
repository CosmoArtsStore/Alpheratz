using Alpheratz.Contracts.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// High-performance implementation of perceptual hashing using D-Hash.
/// Ported and optimized from the heritage phash.rs logic.
/// </summary>
public class PdqHashService : IPdqHashService
{
    public async Task<string> CalculatePdqHashAsync(string path)
    {
        if (!File.Exists(path)) return string.Empty;

        return await Task.Run(() =>
        {
            try
            {
                using var image = Image.Load<L8>(path);
                // Resize to 9x8 for Difference Hash (D-Hash)
                image.Mutate(x => x.Resize(9, 8));

                var hash = new byte[8];
                for (int y = 0; y < 8; y++)
                {
                    for (int x = 0; x < 8; x++)
                    {
                        if (image[x, y].PackedValue > image[x + 1, y].PackedValue)
                        {
                            hash[y] |= (byte)(1 << x);
                        }
                    }
                }
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            catch
            {
                return string.Empty;
            }
        });
    }

    public int GetDistance(string hash1, string hash2)
    {
        if (string.IsNullOrEmpty(hash1) || string.IsNullOrEmpty(hash2) || hash1.Length != hash2.Length)
            return int.MaxValue;

        int distance = 0;
        for (int i = 0; i < hash1.Length; i += 2)
        {
            var b1 = byte.Parse(hash1.Substring(i, 2), System.Globalization.NumberStyles.HexNumber);
            var b2 = byte.Parse(hash2.Substring(i, 2), System.Globalization.NumberStyles.HexNumber);
            distance += System.Numerics.BitOperations.PopCount((uint)(b1 ^ b2));
        }
        return distance;
    }
}
