import { NextResponse } from 'next/server';
import { getAppSetting, setAppSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEFAULT_FAVORITE_PAIRS = ['EURUSD', 'GBPUSD', 'USDCAD', 'NZDCAD'];

export async function GET() {
  try {
    const raw = getAppSetting('favorite_pairs');
    let favorites: string[] = DEFAULT_FAVORITE_PAIRS;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          favorites = parsed.map((s: unknown) => String(s).toUpperCase().trim());
        }
      } catch {
        favorites = DEFAULT_FAVORITE_PAIRS;
      }
    } else {
      // Initialize with default
      setAppSetting('favorite_pairs', JSON.stringify(DEFAULT_FAVORITE_PAIRS));
    }

    return NextResponse.json({
      success: true,
      favorites
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message, favorites: DEFAULT_FAVORITE_PAIRS },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = getAppSetting('favorite_pairs');
    let currentFavorites: string[] = [];

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          currentFavorites = parsed.map((s: unknown) => String(s).toUpperCase().trim());
        }
      } catch {
        currentFavorites = [...DEFAULT_FAVORITE_PAIRS];
      }
    } else {
      currentFavorites = [...DEFAULT_FAVORITE_PAIRS];
    }

    // Mode A: bulk replace array
    if (Array.isArray(body.favorites)) {
      const sanitized = Array.from(
        new Set(body.favorites.map((s: unknown) => String(s).toUpperCase().trim()).filter(Boolean))
      );
      setAppSetting('favorite_pairs', JSON.stringify(sanitized));
      return NextResponse.json({
        success: true,
        favorites: sanitized
      });
    }

    // Mode B: single symbol toggle / set
    if (typeof body.symbol === 'string' && body.symbol.trim()) {
      const sym = body.symbol.toUpperCase().trim();
      let updated: string[];

      if (body.isFavorite === true) {
        updated = Array.from(new Set([...currentFavorites, sym]));
      } else if (body.isFavorite === false) {
        updated = currentFavorites.filter(s => s !== sym);
      } else {
        // Toggle
        if (currentFavorites.includes(sym)) {
          updated = currentFavorites.filter(s => s !== sym);
        } else {
          updated = [...currentFavorites, sym];
        }
      }

      setAppSetting('favorite_pairs', JSON.stringify(updated));
      return NextResponse.json({
        success: true,
        symbol: sym,
        isFavorite: updated.includes(sym),
        favorites: updated
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payload: provide symbol or favorites array' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
