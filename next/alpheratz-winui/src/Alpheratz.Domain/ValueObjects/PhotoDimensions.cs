namespace Alpheratz.Domain.ValueObjects;

/// <summary>
/// Represents the pixel dimensions of a photo.
/// </summary>
/// <param name="Width">The width in pixels.</param>
/// <param name="Height">The height in pixels.</param>
public readonly record struct PhotoDimensions(int Width, int Height)
{
    /// <summary>
    /// Gets the aspect ratio (Width / Height). Returns 0 if Height is 0.
    /// </summary>
    public float AspectRatio => Height == 0 ? 0 : (float)Width / Height;

    /// <summary>
    /// Gets whether the dimensions are valid (both greater than zero).
    /// </summary>
    public bool IsValid => Width > 0 && Height > 0;

    /// <summary>
    /// Returns a string representation of the dimensions (e.g., "1920x1080").
    /// </summary>
    public override string ToString() => $"{Width}x{Height}";

    /// <summary>
    /// Creates a default/empty dimension object.
    /// </summary>
    public static PhotoDimensions Empty => new(0, 0);
}
