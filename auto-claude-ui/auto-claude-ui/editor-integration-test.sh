#!/bin/bash

# Editor Integration E2E Verification Script
# This script tests the end-to-end editor integration workflow

echo "🚀 Starting Editor Integration E2E Verification"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Function to log test results
log_test() {
    local test_name="$1"
    local result="$2"
    local message="$3"

    TOTAL=$((TOTAL + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} ${test_name}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} ${test_name}: $message"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "\n${BLUE}1. TypeScript Compilation Tests${NC}"

# Test TypeScript compilation
echo "Testing TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
    log_test "TypeScript Compilation" "PASS"
else
    log_test "TypeScript Compilation" "FAIL" "TypeScript errors detected"
fi

# Test specific components
echo "Testing component compilation..."
if npx tsc --noEmit --jsx react-jsx src/renderer/components/settings/EditorSettings.tsx 2>/dev/null; then
    log_test "EditorSettings Component" "PASS"
else
    log_test "EditorSettings Component" "FAIL" "EditorSettings compilation failed"
fi

if npx tsc --noEmit --jsx react-jsx src/renderer/components/Worktrees.tsx 2>/dev/null; then
    log_test "Worktrees Component" "PASS"
else
    log_test "Worktrees Component" "FAIL" "Worktrees compilation failed"
fi

if npx tsc --noEmit --jsx react-jsx src/renderer/components/settings/AppSettings.tsx 2>/dev/null; then
    log_test "AppSettings Component" "PASS"
else
    log_test "AppSettings Component" "FAIL" "AppSettings compilation failed"
fi

echo -e "\n${BLUE}2. File Structure Tests${NC}"

# Check if all required files exist
echo "Checking required files..."

files_to_check=(
    "src/shared/types/editor.ts"
    "src/shared/constants/editors.ts"
    "src/main/utils/editor-detector.ts"
    "src/main/utils/editor-launcher.ts"
    "src/renderer/components/settings/EditorSettings.tsx"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        log_test "File Exists: $file" "PASS"
    else
        log_test "File Exists: $file" "FAIL" "Required file missing"
    fi
done

echo -e "\n${BLUE}3. Import/Export Tests${NC}"

# Test if modules can be imported (basic syntax check)
echo "Testing module imports..."

# Check editor types
if grep -q "export.*CodeEditorType" src/shared/types/editor.ts; then
    log_test "Editor Types Export" "PASS"
else
    log_test "Editor Types Export" "FAIL" "CodeEditorType not exported"
fi

# Check editor constants
if grep -q "export.*SUPPORTED_EDITORS" src/shared/constants/editors.ts; then
    log_test "Editor Constants Export" "PASS"
else
    log_test "Editor Constants Export" "FAIL" "SUPPORTED_EDITORS not exported"
fi

# Check if EditorSettings component is exported
if grep -q "export.*EditorSettings" src/renderer/components/settings/EditorSettings.tsx; then
    log_test "EditorSettings Export" "PASS"
else
    log_test "EditorSettings Export" "FAIL" "EditorSettings not exported"
fi

echo -e "\n${BLUE}4. Settings Integration Tests${NC}"

# Check if EditorSettings is integrated into AppSettings
if grep -q "EditorSettings" src/renderer/components/settings/AppSettings.tsx; then
    log_test "EditorSettings Integration" "PASS"
else
    log_test "EditorSettings Integration" "FAIL" "EditorSettings not integrated"
fi

# Check if settings store can handle editor settings
if grep -q "editorSettings" src/renderer/stores/settings-store.ts; then
    log_test "Editor Settings Store" "PASS"
else
    log_test "Editor Settings Store" "FAIL" "Editor settings not found in store"
fi

echo -e "\n${BLUE}5. IPC Handler Tests${NC}"

# Check if editor IPC handlers exist
if grep -q "EDITOR_GET_AVAILABLE\|TASK_OPEN_IN_EDITOR" src/main/ipc-handlers/settings-handlers.ts 2>/dev/null || \
   grep -q "TASK_OPEN_IN_EDITOR" src/main/ipc-handlers/task/worktree-handlers.ts 2>/dev/null; then
    log_test "Editor IPC Handlers" "PASS"
else
    log_test "Editor IPC Handlers" "FAIL" "Editor IPC handlers not found"
fi

echo -e "\n${BLUE}6. Worktree Integration Tests${NC}"

# Check if Worktrees component has editor integration
if grep -q "Open in Editor\|editor" src/renderer/components/Worktrees.tsx; then
    log_test "Worktree Editor Integration" "PASS"
else
    log_test "Worktree Editor Integration" "FAIL" "Editor integration not found in Worktrees"
fi

echo -e "\n${BLUE}7. Platform Support Tests${NC}"

# Check if multiple platforms are supported
platform_count=$(grep -c "darwin\|win32\|linux" src/shared/constants/editors.ts || echo "0")
if [ "$platform_count" -gt 1 ]; then
    log_test "Cross-Platform Support" "PASS" "Found $platform_count platform references"
else
    log_test "Cross-Platform Support" "FAIL" "Limited platform support detected"
fi

echo -e "\n${BLUE}8. Editor Support Tests${NC}"

# Count supported editors
editor_count=$(grep -c '"id":' src/shared/constants/editors.ts 2>/dev/null || echo "0")
if [ "$editor_count" -gt 10 ]; then
    log_test "Editor Variety" "PASS" "Found $editor_count supported editors"
else
    log_test "Editor Variety" "FAIL" "Only $editor_count editors supported"
fi

echo -e "\n${BLUE}9. Development Server Status${NC}"

# Check if development server is running
if pgrep -f "electron.*dev" >/dev/null || pgrep -f "npm.*dev" >/dev/null; then
    log_test "Development Server" "PASS" "Development server is running"
else
    log_test "Development Server" "FAIL" "Development server not detected"
fi

echo -e "\n${BLUE}Summary${NC}"
echo "=========="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Editor integration is ready for manual testing.${NC}"
    echo ""
    echo "Next steps for manual verification:"
    echo "1. Open the app and navigate to Settings → Code Editor"
    echo "2. Configure your preferred editor"
    echo "3. Navigate to a worktree and verify 'Open in Editor' button appears"
    echo "4. Test editor launching functionality"
    exit 0
else
    echo -e "\n${RED}❌ $FAILED tests failed. Please fix issues before proceeding.${NC}"
    exit 1
fi