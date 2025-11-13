# ⚡ FIX: React Warning - Non-boolean Attribute

**Issue:** Console warnings về non-boolean attributes trong styled-components  
**Date:** 2024-10-13  
**Status:** ✅ FIXED

---

## 🐛 ERRORS FIXED

### **Error 1: `isOnline` prop warning**
```
❌ Received `true` for a non-boolean attribute `isOnline`.
   If you want to write it to the DOM, pass a string instead: 
   isOnline="true" or isOnline={value.toString()}.
```

### **Error 2: `active` prop warning**
```
❌ Received `true` for a non-boolean attribute `active`.
   If you want to write it to the DOM, pass a string instead: 
   active="true" or active={value.toString()}.
```

### **Error 3: `isOnline` not recognized**
```
❌ React does not recognize the `isOnline` prop on a DOM element.
```

---

## 🎯 ROOT CAUSE

**Styled-components** tự động pass **ALL props** xuống DOM element. Nhưng DOM chỉ chấp nhận:
- ✅ Standard HTML attributes (như `id`, `className`, `style`)
- ✅ Data attributes (`data-*`)
- ✅ Aria attributes (`aria-*`)
- ❌ Custom props (như `isOnline`, `active`, `variant`)

Khi pass custom props → React warning → Performance issue

---

## ✅ SOLUTION: Transient Props

Styled-components v5.1+ hỗ trợ **transient props** với prefix `$`:
- Props bắt đầu bằng `$` → **KHÔNG** pass xuống DOM
- Props không có `$` → Pass xuống DOM

---

## 🔧 CHANGES MADE

### **1. OnlineIndicator Component**

**Before:**
```typescript
const OnlineIndicator = styled.div<{ isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.isOnline ? '#00ff00' : '#888')};
  animation: ${(props) => (props.isOnline ? pulse : 'none')} 2s infinite;
`;

// Usage
<OnlineIndicator isOnline={friend.isOnline} />
```

**After:**
```typescript
const OnlineIndicator = styled.div<{ $isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.$isOnline ? '#00ff00' : '#888')};
  animation: ${(props) => (props.$isOnline ? pulse : 'none')} 2s infinite;
`;

// Usage
<OnlineIndicator $isOnline={friend.isOnline} />
```

**Changes:**
- ✅ `isOnline` → `$isOnline` in type definition
- ✅ `props.isOnline` → `props.$isOnline` in styles
- ✅ `isOnline={...}` → `$isOnline={...}` in JSX

---

### **2. Tab Component**

**Before:**
```typescript
const Tab = styled.button<{ active: boolean }>`
  background: ${(props) => (props.active ? 'rgba(78, 205, 196, 0.3)' : 'rgba(0, 0, 0, 0.6)')};
  border: 2px solid ${(props) => (props.active ? '#4ecdc4' : '#444')};
`;

// Usage
<Tab active={activeTab === 'friends'} onClick={...}>
  Bạn bè
</Tab>
```

**After:**
```typescript
const Tab = styled.button<{ $active: boolean }>`
  background: ${(props) => (props.$active ? 'rgba(78, 205, 196, 0.3)' : 'rgba(0, 0, 0, 0.6)')};
  border: 2px solid ${(props) => (props.$active ? '#4ecdc4' : '#444')};
`;

// Usage
<Tab $active={activeTab === 'friends'} onClick={...}>
  Bạn bè
</Tab>
```

**Changes:**
- ✅ `active` → `$active` in type definition
- ✅ `props.active` → `props.$active` in styles
- ✅ `active={...}` → `$active={...}` in JSX

---

## 📁 FILES MODIFIED

1. ✅ `client/src/components/FriendsManager.tsx`
   - Line ~101: `OnlineIndicator` definition
   - Line ~131: `Tab` definition
   - Line ~492-498: `Tab` usage (3 places)
   - Line ~540+: `OnlineIndicator` usage (multiple places)

---

## ✅ VERIFICATION

After fix, console should be **clean** - no warnings about:
- ❌ Non-boolean attributes
- ❌ Unrecognized props on DOM elements

---

## 📚 BEST PRACTICES

### **When to use transient props:**

✅ **Use `$` prefix for:**
- Conditional styling props (`$active`, `$disabled`, `$selected`)
- Custom state props (`$isOnline`, `$isLoading`, `$hasError`)
- Component variants (`$variant`, `$size`, `$theme`)

❌ **Don't use `$` for:**
- Standard HTML attributes (`id`, `className`, `onClick`)
- Data attributes (`data-testid`)
- Aria attributes (`aria-label`)

### **Examples:**

```typescript
// ✅ Good: Custom styling props with $
const Button = styled.button<{ $variant: 'primary' | 'secondary' }>`
  background: ${p => p.$variant === 'primary' ? 'blue' : 'gray'};
`;
<Button $variant="primary">Click</Button>

// ✅ Good: Standard HTML props without $
const Input = styled.input`
  border: 1px solid gray;
`;
<Input type="text" placeholder="Enter name" />

// ❌ Bad: Custom props without $
const Card = styled.div<{ isHighlighted: boolean }>`
  border: ${p => p.isHighlighted ? '2px solid gold' : 'none'};
`;
<Card isHighlighted={true} /> // ⚠️ Warning!

// ✅ Fixed: Use $ prefix
const Card = styled.div<{ $isHighlighted: boolean }>`
  border: ${p => p.$isHighlighted ? '2px solid gold' : 'none'};
`;
<Card $isHighlighted={true} /> // ✅ No warning
```

---

## 🎯 BENEFITS

✅ **No React warnings** → Cleaner console  
✅ **Better performance** → Less DOM pollution  
✅ **Type safety** → TypeScript catches errors  
✅ **Industry standard** → Follows styled-components best practices  

---

## 🔗 RELATED

- [Styled-components Docs: Transient Props](https://styled-components.com/docs/api#transient-props)
- React docs on DOM attributes
- TypeScript with styled-components

---

**Fix Time:** 5 minutes  
**Impact:** Low (cosmetic fix)  
**Priority:** Medium (good practice)  
**Last Updated:** 2024-10-13
