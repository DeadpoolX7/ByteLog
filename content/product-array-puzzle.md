---
title: "Product Array Puzzle sum"
description: Succint explaination with solution of product array puzzle sum using naive and optimal approach in Java.
date: 2025-03-30
author: Deadpool
keywords: DSA, Java, Arrays, Prefix sum, Suffix Sum
---

# Optimizing the Product Array Puzzle: A Deep Dive into Efficient Solutions

The **Product Array Puzzle** is a classic algorithm problem that asks us to compute a product of all the elements in an array, except the current element at each position. The challenge is to solve this problem without using division, as division may lead to errors or inefficiencies. In this blog, we will compare two different approaches to solving the problem: the **Naive Solution** and the **Optimized Solution**, and discuss which one you should use and why.

Problem Statement
-----------------

Given an array `arr[]` of size `n`, return an array `res[]` such that:

    res[i] = product(arr[0] * arr[1] * ... * arr[i-1] * arr[i+1] * ... * arr[n-1])
    

In other words, for each index `i`, we want the product of all elements of the array except `arr[i]`.

### Naive Approach: Using Division

Here is the **Naive Solution** that uses division to solve the problem. The approach works by calculating the total product of all elements in the array, then dividing this total by the current element for each index.

#### Code:

    public static int[] productExceptSelf(int arr[]) {
        int[] res = new int[arr.length];
        int product = 1;
    
        for (int i = 0; i < arr.length; i++) {
            product *= arr[i];
        }
    
        for (int j = 0; j < arr.length; j++) {
            res[j] = product / arr[j];
        }
        return res;
    }
    

#### Explanation:

1.  **Step 1:** Calculate the total product of all elements in the array.
    
2.  **Step 2:** For each element in the array, divide the total product by that element to get the desired result.
    

#### Limitations:

*   **Division by Zero:** This solution doesn't handle cases where an element in the array is zero. Dividing by zero will result in a runtime error.
    
*   **Inefficiency with Division:** While the solution is simple, division can be costly in terms of both time and space, especially with larger arrays.
    

### Optimized Approach: Without Using Division

To solve the problem more efficiently and avoid division, we can break the solution into two parts — calculating the product of all elements to the left and right of each index.

#### Optimized Code:

    public static int[] productExceptSelf(int arr[]) {
        int n = arr.length;
        int[] res = new int[n];
    
        // Step 1: Construct left product array
        int[] left = new int[n];
        left[0] = 1;
        for (int i = 1; i < n; i++) {
            left[i] = left[i - 1] * arr[i - 1];
        }
    
        // Step 2: Construct right product array and compute result
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] = left[i] * right;
            right *= arr[i]; // Update right product
        }
    
        return res;
    }
    

#### Explanation:

1.  **Step 1:** Create a left product array, where each element `left[i]` holds the product of all elements to the left of index `i`.
    
2.  **Step 2:** Traverse the array from right to left, maintaining a running product of elements to the right (`right`), and update the result array by multiplying the left product and the right product for each index.
    

#### Benefits:

*   **No Division:** This solution avoids division entirely, which eliminates the risk of dividing by zero.
    
*   **Optimal Time Complexity:** This solution runs in **O(n)** time, where `n` is the size of the array, as we only traverse the array twice.
    
*   **Space Efficiency:** With a slight modification, this approach can be optimized to **O(1)** extra space by using the result array itself to store the left products.
    

### Time and Space Complexity Comparison

### Time and Space Complexity Comparison

| Approach                     | Time Complexity | Space Complexity |
|------------------------------|----------------|------------------|
| Naive (Using Division)       | O(n)           | O(1)             |
| Optimized (Without Division) | O(n)           | O(n)             |


While both solutions have the same **time complexity** of O(n), the **Optimized Approach** is clearly the better choice because it:

*   Avoids division, making it safer.
    
*   Can be optimized to **O(1)** space complexity by reducing the space used for the left and right product arrays.
    

### Which Solution to Use?

*   **Use the Optimized Solution** in real-world applications. It is more robust, handles edge cases (like zeroes in the array), and can be further optimized to use constant space, which is crucial for large inputs.
    
*   **Use the Naive Solution** only if you are working in a controlled environment where division by zero is not a concern, and you need a simpler approach.
    

### Conclusion

The **Optimized Solution** is the recommended choice for solving the Product Array Puzzle, as it is both **time-efficient** and **space-efficient** while avoiding the pitfalls of division. By leveraging **prefix and suffix products**, this approach ensures that we can calculate the desired result in linear time and without any division operations, thus making it more robust and reliable for handling various edge cases.
