package ir.mazraerangi.game;

import android.content.pm.ActivityInfo;
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
        if (getRequestedOrientation() != ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        }

        getWindow().getDecorView().setBackgroundColor(BG_SKY);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        bindCutoutSafeAreaInsets();
        applyImmersiveFullscreen();
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
            Insets safe = insets.getInsets(
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
        applyImmersiveFullscreen();
        configureActiveWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
            configureActiveWebView();
        }
    }

    private void applyImmersiveFullscreen() {
        View decor = getWindow().getDecorView();
        decor.setBackgroundColor(BG_SKY);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController ctrl = getWindow().getInsetsController();
            if (ctrl != null) {
                ctrl.hide(android.view.WindowInsets.Type.statusBars()
                    | android.view.WindowInsets.Type.navigationBars());
                ctrl.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}
