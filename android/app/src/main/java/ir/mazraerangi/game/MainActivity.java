package ir.mazraerangi.game;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int BG_SKY = 0xFF7CC8F4;
    private volatile String lastSafeKey = null;

    private WebView activeWebView() {
        if (isFinishing() || isDestroyed()) return null;
        Bridge b = getBridge();
        return b != null ? b.getWebView() : null;
    }

    private void evalSafeAreaOnWebView(final String js) {
        final WebView wv = activeWebView();
        if (js == null || wv == null) return;
        wv.post(() -> {
            WebView live = activeWebView();
            if (live != null) {
                try {
                    live.evaluateJavascript(js, null);
                } catch (Throwable ignored) {
                }
            }
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // sensorLandscape is declared in the manifest so the splash never starts in portrait.
        getWindow().getDecorView().setBackgroundColor(BG_SKY);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        bindCutoutSafeAreaInsets();
        configureActiveWebView();
    }

    private void configureActiveWebView() {
        getWindow().getDecorView().setBackgroundColor(BG_SKY);
        WebView wv = activeWebView();
        if (wv != null) {
            // حفظ شتاب سخت‌افزاری بدون قفل کردن نخ UI اندروید + پس‌زمینهٔ یکدست آسمان بدون Overscroll
            wv.setBackgroundColor(BG_SKY);
            wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
            wv.setVerticalScrollBarEnabled(false);
            wv.setHorizontalScrollBarEnabled(false);
            wv.setFocusable(true);
            wv.setFocusableInTouchMode(true);
            wv.setClickable(true);
            if (!wv.hasFocus()) {
                wv.requestFocus();
            }
        }
    }

    private void bindCutoutSafeAreaInsets() {
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            if (isFinishing() || isDestroyed()) {
                return insets;
            }
            // Keep CSS safe areas stable when transient bars change visibility; visible-only
            // insets otherwise move the loading card and controls during startup.
            Insets safe = insets.getInsetsIgnoringVisibility(
                WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.systemBars()
            );
            float density = getResources().getDisplayMetrics().density;
            if (density <= 0f) density = 1f;
            int topPx = Math.round(safe.top / density);
            int rightPx = Math.round(safe.right / density);
            int bottomPx = Math.round(safe.bottom / density);
            int leftPx = Math.round(safe.left / density);

            String key = topPx + "," + rightPx + "," + bottomPx + "," + leftPx;
            if (!key.equals(lastSafeKey)) {
                lastSafeKey = key;
                String js = String.format(
                    Locale.US,
                    "(function(){var r=document.documentElement;if(!r)return;"
                    + "r.style.setProperty('--safe-top','%dpx');"
                    + "r.style.setProperty('--safe-right','%dpx');"
                    + "r.style.setProperty('--safe-bottom','%dpx');"
                    + "r.style.setProperty('--safe-left','%dpx');})();",
                    topPx, rightPx, bottomPx, leftPx
                );
                evalSafeAreaOnWebView(js);
            }
            return insets;
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        applyGameSystemBars();
        configureActiveWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyGameSystemBars();
            configureActiveWebView();
        }
    }

    private void applyGameSystemBars() {
        View decor = getWindow().getDecorView();
        decor.setBackgroundColor(BG_SKY);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController ctrl = getWindow().getInsetsController();
            if (ctrl != null) {
                ctrl.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
                // Android shows a modal, first-run "Viewing full screen" confirmation
                // whenever the navigation bar is hidden. It intercepts every WebView
                // touch, including Start. Keep the navigation bar visible and hide only
                // the status bar; the game remains edge-to-edge with stable safe areas.
                ctrl.show(android.view.WindowInsets.Type.navigationBars());
                ctrl.hide(android.view.WindowInsets.Type.statusBars());
            }
        } else {
            decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}
